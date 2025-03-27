// https://bugs.chromium.org/p/chromium/issues/detail?id=1198822
// Dynamic import is not available yet in MV3 service worker
// Once implemented, module will be dynamically imported for Firefox only

// https://bugzilla.mozilla.org/show_bug.cgi?id=1853203
// Support non-ASCII username/password for socks proxy (fixed in Firefox 119)

// https://bugzilla.mozilla.org/show_bug.cgi?id=1741375
// Proxy DNS by default when using SOCKS v5 (fixed in Firefox 128, defaults to true for SOCKS5 & false for SOCKS4)
// https://bugzilla.mozilla.org/show_bug.cgi?id=1893670
// Proxy DNS by default for SOCK4 proxies. Defaulting to SOCKS4a

// proxyAuthorizationHeader on Firefox only applied to HTTPS (HTTP broke the API and sent DIRECT)
// https://bugzilla.mozilla.org/show_bug.cgi?id=1794464
// Allow HTTP authentication in proxy.onRequest (fixed in Firefox 125)

// proxy.onRequest only applies to http/https/ws/wss
// it can not catch domains set by user to 127.0.0.1 in the hosts file

import {App} from './app.js';
import {Pattern} from './pattern.js';
import {Location} from './location.js';

// ---------- Firefox proxy.onRequest API ------------------
export class OnRequest {

  static {
    // --- default values
    this.mode = 'disable';
    // used for Single Proxy
    this.proxy = {};
    // used for Proxy by Pattern
    this.data = [];
    // RegExp string
    this.passthrough = [];
    // [start, end] strings
    this.net = [];
    // tab proxy, will be lost in MV3 background unloading
    this.tabProxy = {};
    // incognito/container proxy
    this.container = {};

    // --- Firefox only
    if (browser.proxy.onRequest) {
      browser.proxy.onRequest.addListener(e => this.process(e), {urls: ['<all_urls>']});
      // check Tab for tab proxy
      browser.tabs.onUpdated.addListener((...e) => this.onUpdated(...e));
      // remove redundant data from this.tabProxy cache
      browser.tabs.onRemoved.addListener(tabId => delete this.tabProxy[tabId]);
      // mark incognito/container
      browser.tabs.onCreated.addListener(e => this.checkPageAction(e));

      // prevent proxy.onRequest.addListener unloading in MV3 (default 30s)
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1771203
      // it can trigger DNS leak on reloading under limited circumstances
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1882276
      this.persist();
    }
  }

  static persist() {
    // clear the previous interval & set a new one
    clearInterval(this.interval);
    this.interval = setInterval(() => browser.runtime.getPlatformInfo(), 25_000);
  }

  static init(pref) {
    this.mode = pref.mode;
    [this.passthrough, , this.net] = Pattern.getPassthrough(pref.passthrough);

    // filter data
    const data = pref.data.filter(i => i.active && i.type !== 'pac' && i.hostname);

    // --- single proxy (false|undefined|proxy object)
    this.proxy = /:\d+[^/]*$/.test(pref.mode) && data.find(i => pref.mode === `${i.hostname}:${i.port}`);

    // --- proxy by pattern
    this.data = data.filter(i => i.include[0] || i.exclude[0] || i.tabProxy?.[0]).map(item => {
      item.tabProxy ||= [];
      return {
        type: item.type,
        hostname: item.hostname,
        port: item.port,
        username: item.username,
        password: item.password,
        // proxyDNS used in mode pattern or single proxy
        proxyDNS: item.proxyDNS,
        include: item.include.filter(i => i.active).map(i => Pattern.get(i.pattern, i.type)),
        exclude: item.exclude.filter(i => i.active).map(i => Pattern.get(i.pattern, i.type)),
        tabProxy: item.tabProxy.filter(i => i.active).map(i => Pattern.get(i.pattern, i.type)),

        // used for showPatternProxy
        title: item.title,
        cc: item.cc,
        city: item.city,
        color: item.color,
      };
    });

    // --- incognito/container proxy
    // reset container
    this.container = {};
    pref.container && Object.entries(pref.container).forEach(([key, val]) => {
      // prefix key
      key.startsWith('container-') && (key = 'firefox-' + key);
      this.container[key] = val && data.find(i => val === `${i.hostname}:${i.port}`);
    });

    // mirror as this.tabProxy is lost in MV3 background unloading
    browser.storage.session.get('tabProxy')
    .then(i => this.tabProxy = i.tabProxy || {});
  }

  static process(e) {
    // reset interval
    this.persist();

    const tabId = e.tabId;
    const fromTab = tabId !== -1;

    // --- check Tab Proxy Pattern
    this.processTabProxy(tabId, e.url, e);

    switch (true) {
      // --- check local & global passthrough
      case this.bypass(e.url):
        this.setAction(tabId);
        return {type: 'direct'};

      // --- tab proxy
      case fromTab && !!this.tabProxy[tabId]:
        return this.processProxy(tabId, this.tabProxy[tabId]);

      // --- incognito proxy
      case fromTab && e.incognito && !!this.container.incognito:
        return this.processProxy(tabId, this.container.incognito);

      // --- container proxy
      case fromTab && e.cookieStoreId && !!this.container[e.cookieStoreId]:
        return this.processProxy(tabId, this.container[e.cookieStoreId]);

      // --- standard operation
      // pass direct
      case this.mode === 'disable':
      case this.mode === 'direct':
      // PAC URL is set
      case this.mode.includes('://') && !/:\d+$/.test(this.mode):
        this.setAction(tabId);
        return {type: 'direct'};

      // check if url matches patterns
      case this.mode === 'pattern':
        return this.processPattern(tabId, e.url);

      // get the proxy for all
      default:
        return this.processProxy(tabId, this.proxy);
    }
  }

  static processTabProxy(tabId, url, e) {
    if (this.mode !== 'pattern' || e.type !== 'main_frame' || this.tabProxy[tabId]) { return; }

    const match = arr => arr.some(i => new RegExp(i, 'i').test(url));
    const proxy = this.data.find(i => match(i.tabProxy));
    proxy && (this.tabProxy[tabId] = proxy);
  }

  static processPattern(tabId, url) {
    const match = arr => arr.some(i => new RegExp(i, 'i').test(url));
    const proxy = this.data.find(i => !match(i.exclude) && match(i.include));
    if (proxy) {
      return this.processProxy(tabId, proxy);
    }

    // no match
    this.setAction(tabId);
    return {type: 'direct'};
  }

  static processProxy(tabId, proxy) {
    this.setAction(tabId, proxy);
    const {type, hostname: host, port, username, password, proxyDNS} = proxy || {};
    if (!type || type === 'direct') { return {type: 'direct'}; }

    const auth = username && password && type.startsWith('http');

    const response = {
      host,

      // https://searchfox.org/mozilla-central/source/toolkit/components/extensions/ProxyChannelFilter.sys.mjs#102
      // Although API converts to number -> let port = Number.parseInt(proxyData.port, 10);
      // port 'number', prepare for augmented port
      port: parseInt(port),

      // https://searchfox.org/mozilla-central/source/toolkit/components/extensions/ProxyChannelFilter.sys.mjs#43
      // API uses socks for socks5
      type: type === 'socks5' ? 'socks' : type,

      // https://searchfox.org/mozilla-central/source/toolkit/components/extensions/ProxyChannelFilter.sys.mjs#135
      ...(type.startsWith('socks') && {proxyDNS: !!proxyDNS}),

      // https://searchfox.org/mozilla-central/source/toolkit/components/extensions/ProxyChannelFilter.sys.mjs#117
      // https://searchfox.org/mozilla-central/source/toolkit/components/extensions/ProxyChannelFilter.sys.mjs#126
      // https://searchfox.org/mozilla-central/source/toolkit/components/extensions/ProxyChannelFilter.sys.mjs#231
      // only used for SOCKS 4/5, must be string and not undefined
      // allow sending username without password
      username,
      password,

      // https://searchfox.org/mozilla-central/source/toolkit/components/extensions/ProxyChannelFilter.sys.mjs#167
      // only for HTTP/HTTPS
      // use proxyAuthorizationHeader to reduce requests in webRequest.onAuthRequired
      ...(auth && {proxyAuthorizationHeader: 'Basic ' + btoa(username + ':' + password)}),
    };

    return response;
  }

  // browser.action here only relates to showPatternProxy from proxy.onRequest
  static setAction(tabId, item) {
    // Set to -1 if the request isn't related to a tab
    if (tabId === -1) { return; }

    // --- reset values
    let title = '';
    let text = '';
    let color = '';

    // --- set proxy details
    if (item) {
      const host = [item.hostname, item.port].filter(Boolean).join(':');
      title = [item.title, host, item.city, Location.get(item.cc)].filter(Boolean).join('\n');
      text = item.title || item.hostname;
      color = item.color;
    }

    color && browser.action.setBadgeBackgroundColor({color, tabId});
    browser.action.setTitle({title, tabId});
    browser.action.setBadgeText({text, tabId});
  }

  // ---------- passthrough --------------------------------
  // Firefox & Chrome have a default localhost bypass
  // Connections to localhost, 127.0.0.1/8, and ::1 are never proxied.
  // Firefox: "network.proxy.allow_hijacking_localhost"
  // Chrome: --proxy-bypass-list="<-loopback>"
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1854324
  // proxy.onRequest failure to bypass proxy for localhost (fixed in Firefox 137)
  static bypass(url) {
    switch (true) {
      // global passthrough
      case this.passthrough.some(i => new RegExp(i, 'i').test(url)):
      // global passthrough CIDR
      case this.net[0] && this.isInNet(url):
        return true;
    }
  }

  static isInNet(url) {
    // check if IP address
    if (!/^[a-z]+:\/\/\d+(\.\d+){3}(:\d+)?\//.test(url)) { return; }

    // IP array
    const ipa = url.split(/[:/.]+/, 5).slice(1);
    // convert to padded string
    const ip = ipa.map(i => i.padStart(3, '0')).join('');
    return this.net.some(([st, end]) => ip >= st && ip <= end);
  }

  // ---------- Tab Proxy ----------------------------------
  static setTabProxy(tab, pxy) {
    switch (true) {
      // unacceptable URLs
      case !App.allowedTabProxy(tab.url):
      // check global passthrough
      case this.bypass(tab.url):
        return;
    }

    // set or unset
    pxy ? this.tabProxy[tab.id] = pxy : delete this.tabProxy[tab.id];
    this.setAction(tab.id, pxy);

    // mirror as this.tabProxy is lost in MV3 background unloading
    browser.storage.session.set({'tabProxy': this.tabProxy});
  }

  // ---------- Update Page Action -------------------------
  static onUpdated(tabId, changeInfo, tab) {
    if (changeInfo.status !== 'complete') { return; }

    const pxy = this.tabProxy[tabId];
    pxy ? this.setAction(tab.id, pxy) : this.checkPageAction(tab);
  }

  // ---------- Incognito/Container ------------------------
  static checkPageAction(tab) {
    // not if tab proxy is set
    if (tab.id === -1 || this.tabProxy[tab.id]) { return; }

    const pxy = tab.incognito ? this.container.incognito : this.container[tab.cookieStoreId];
    pxy && this.setAction(tab.id, pxy);
  }
}