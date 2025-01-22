// https://bugs.chromium.org/p/chromium/issues/detail?id=1198822
// Dynamic import is not available yet in MV3 service worker
// Once implemented, module will be dynamically imported for Firefox only

// https://bugzilla.mozilla.org/show_bug.cgi?id=1853203
// Support non-ASCII username/password for socks proxy (fixed in Firefox 119)

// proxyAuthorizationHeader on Firefox only applied to HTTPS (not HTTP and HTTP broke the API and sent DIRECT)
// https://bugzilla.mozilla.org/show_bug.cgi?id=1794464
// Allow HTTP authentication in proxy.onRequest (fixed in Firefox 125)

// https://bugzilla.mozilla.org/show_bug.cgi?id=1741375
// Proxy DNS by default when using SOCKS v5 (fixed in Firefox 128, defaults to true for SOCKS5 & false for SOCKS4)
// https://bugzilla.mozilla.org/show_bug.cgi?id=1893670
// Proxy DNS by default for SOCK4 proxies. Defaulting to SOCKS4a

import {App} from './app.js';
import {Pattern} from './pattern.js';
import {Location} from './location.js';

// ---------- Firefox Proxy Process ------------------------
export class OnRequest {

  static {
    // --- default values
    this.mode = 'disable';
    this.proxy = {};                                        // used for Single Proxy
    this.data = [];                                         // used for Proxy by Pattern
    this.passthrough = [];                                  // RegExp string
    this.net = [];                                          // [start, end] strings
    this.tabProxy = {};                                     // tab proxy, may be lost in MV3 if bg is unloaded
    this.container = {};                                    // incognito/container proxy
    this.browserVersion = 0;                                // used for HTTP authentication

    // --- Firefox only
    if (browser.proxy.onRequest) {
      browser.proxy.onRequest.addListener(e => this.process(e), {urls: ['<all_urls>']});
      // check Tab for tab proxy
      browser.tabs.onUpdated.addListener((...e) => this.onUpdated(...e));
      browser.tabs.onRemoved.addListener(tabId => delete this.tabProxy[tabId]);
      // mark incognito/container
      browser.tabs.onCreated.addListener(e => this.checkPageAction(e));
      // check for HTTP authentication use
      browser.runtime.getBrowserInfo().then(info => this.browserVersion = parseInt(info.version));
    }
  }

  static init(pref) {
    this.mode = pref.mode;
    const [passthrough, , net] = Pattern.getPassthrough(pref.passthrough);
    this.passthrough = passthrough;
    this.net = net;

    // filter data
    const data = pref.data.filter(i => i.active && i.type !== 'pac' && i.hostname);

    // --- single proxy (false|undefined|proxy object)
    this.proxy = /:\d+[^/]*$/.test(pref.mode) && data.find(i => pref.mode === `${i.hostname}:${i.port}`);

    // --- proxy by pattern
    this.data = data.filter(i => i.include[0] || i.exclude[0]).map(item => {
      return {
        type: item.type,
        hostname: item.hostname,
        port: item.port,
        username: item.username,
        password: item.password,
        proxyDNS: item.proxyDNS,                            // used in mode pattern or single proxy
        include: item.include.filter(i => i.active).map(i => Pattern.get(i.pattern, i.type)),
        exclude: item.exclude.filter(i => i.active).map(i => Pattern.get(i.pattern, i.type)),

        // used for showPatternProxy
        title: item.title,
        cc: item.cc,
        city: item.city,
        color: item.color,
      };
    });

    // --- incognito/container proxy
    pref.container && Object.entries(pref.container).forEach(([key, val]) => {
      key.startsWith('container-') && (key = 'firefox-' + key); // prefix key
      this.container[key] = val && data.find(i => val === `${i.hostname}:${i.port}`);
    });
  }

  static process(e) {
    const tabId = e.tabId;
    switch (true) {
      // --- check local & global passthrough
      case this.bypass(e.url):
        this.setAction(tabId);
        return {type: 'direct'};

      // --- tab proxy
      case tabId !== -1 && !!this.tabProxy[tabId]:
        return this.processProxy(this.tabProxy[tabId], tabId);

      // --- incognito proxy
      case tabId !== -1 && e.incognito && !!this.container.incognito:
        return this.processProxy(this.container.incognito, tabId);

      // --- container proxy
      case tabId !== -1 && e.cookieStoreId && !!this.container[e.cookieStoreId]:
        return this.processProxy(this.container[e.cookieStoreId], tabId);

      // --- standard operation
      case this.mode === 'disable':                         // pass direct
      case this.mode === 'direct':                          // pass direct
      case this.mode.includes('://') && !/:\d+$/.test(this.mode): // PAC URL is set
        this.setAction(tabId);
        return {type: 'direct'};

      case this.mode === 'pattern':                         // check if url matches patterns
        return this.processPattern(e.url, tabId);

      default:                                              // get the proxy for all
        return this.processProxy(this.proxy, tabId);
    }
  }

  static processPattern(url, tabId) {
    const match = array => array.some(i => new RegExp(i, 'i').test(url));

    for (const proxy of this.data) {
      if (!match(proxy.exclude) && match(proxy.include)) {
        return this.processProxy(proxy, tabId);
      }
    }

    this.setAction(tabId);
    return {type: 'direct'};                                // no match
  }

  static processProxy(proxy, tabId) {
    this.setAction(tabId, proxy);
    const {type, hostname: host, port, username, password, proxyDNS} = proxy || {};
    if (!type || type === 'direct') { return {type: 'direct'}; }

    const up = username && password;
    const auth = up && (type === 'https' || (type === 'http' && this.browserVersion >= 125));

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
      ...(up && {username}),

      // https://searchfox.org/mozilla-central/source/toolkit/components/extensions/ProxyChannelFilter.sys.mjs#126
      ...(up && {password}),

      // https://searchfox.org/mozilla-central/source/toolkit/components/extensions/ProxyChannelFilter.sys.mjs#167
      // proxyAuthorizationHeader added to reduce the authentication request in webRequest.onAuthRequired
      ...(auth && {proxyAuthorizationHeader: 'Basic ' + btoa(proxy.username + ':' + proxy.password)}),
    };

    return response;
  }

  static setAction(tabId, item) {
    // Set to -1 if the request isn't related to a tab
    if (tabId === -1) { return; }

    // --- reset values
    let title = null;
    let text = null;
    let color = null;

    // --- set proxy details
    if (item) {
      const host = [item.hostname, item.port].filter(Boolean).join(':');
      title = [item.title, host, item.city, Location.get(item.cc)].filter(Boolean).join('\n');
      text = item.title || item.hostname;
      color = item.color;
    }

    browser.action.setBadgeBackgroundColor({color, tabId});
    browser.action.setTitle({title, tabId});
    browser.action.setBadgeText({text, tabId});
  }

  // ---------- passthrough --------------------------------
  static bypass(url) {
    switch (true) {
      case this.defaultLocal(url):                          // default localhost passthrough
      case this.passthrough.some(i => new RegExp(i, 'i').test(url)): // global passthrough
      case this.net[0] && this.isInNet(url):                // global passthrough CIDR
        return true;
    }
  }

  // https://bugzilla.mozilla.org/show_bug.cgi?id=1854324
  // proxy.onRequest failure to bypass proxy for localhost
  // https://github.com/foxyproxy/browser-extension/issues/20
  // Firefox & Chrome proxy.settings have a default localhost bypass
  // Connections to localhost, 127.0.0.1/8, and ::1 are never proxied.
  // proxy.onRequest only applies to http/https/ws/wss
  // it can't catch a domain set by user to 127.0.0.1 in the hosts file
  static defaultLocal(url) {
    const {hostname} = new URL(url);
    return ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
  }

  static isInNet(url) {
    // check if IP address
    if (!/^[a-z]+:\/\/\d+(\.\d+){3}(:\d+)?\//.test(url)) { return; }

    const ipa = url.split(/[:/.]+/, 5).slice(1);            // IP array
    const ip = ipa.map(i => i.padStart(3, '0')).join('');   // convert to padded string
    return this.net.some(([st, end]) => ip >= st && ip <= end);
  }

  // ---------- Tab Proxy ----------------------------------
  static setTabProxy(tab, pxy) {
    // const [tab] = await browser.tabs.query({currentWindow: true, active: true});
    switch (true) {
      case !App.allowedTabProxy(tab.url):                   // unacceptable URLs
      case this.bypass(tab.url):                            // check local & global passthrough
        return;
    }

    // set or unset
    pxy ? this.tabProxy[tab.id] = pxy : delete this.tabProxy[tab.id];
    this.setAction(tab.id, pxy);
  }

  // ---------- Update Page Action -------------------------
  static onUpdated(tabId, changeInfo, tab) {
    if (changeInfo.status !== 'complete') { return; }

    const pxy = this.tabProxy[tabId];
    pxy ? this.setAction(tab.id, pxy) : this.checkPageAction(tab);
  }

  // ---------- Incognito/Container ------------------------
  static checkPageAction(tab) {
    if (tab.id === -1 || this.tabProxy[tab.id]) { return; } // not if tab proxy is set

    const pxy = tab.incognito ? this.container.incognito : this.container[tab.cookieStoreId];
    pxy && this.setAction(tab.id, pxy);
  }
}