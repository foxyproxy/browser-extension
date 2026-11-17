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
    // tab proxy by pattern (separate from tab proxy)
    this.tabProxyPattern = {};
    // incognito/container proxy
    this.container = {};

    // --- readiness gate (pre-init DNS-leak race)
    // proxy.onRequest is a persistent event: on browser start, session restore,
    // add-on reload, extension update or event-page wake this module
    // re-evaluates and the listener below is registered synchronously, but
    // OnRequest.init(pref) only runs after background.js has awaited storage.
    // Until then the defaults above (mode 'disable', container {}) would answer
    // {type: 'direct'} and Firefox would resolve the hostname with the OS
    // resolver (DNS leak). Requests arriving in that gap wait for init instead.
    this.ready = false;
    this.initFailed = false;
    this.waiters = new Set();
    // upper bound for waiting on init; kept below the MV3 30s idle timeout
    this.initTimeout = 15_000;
    // monotonic id so a stale init() can never open the gate
    this.initToken = 0;
    // A single ProxyInfo falls back to the browser-defined proxy (DIRECT) when
    // it is unreachable. An array ending in null disables that failover.
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/proxy/onRequest
    this.BLOCK = () => [{type: 'socks', host: '127.0.0.1', port: 1, proxyDNS: true}, null];

    // --- Firefox only
    if (browser.proxy.onRequest) {
      browser.proxy.onRequest.addListener(e => this.process(e), {urls: ['<all_urls>']});
      // check Tab for tab proxy
      browser.tabs.onUpdated.addListener((...e) => this.onUpdated(...e));
      // remove redundant data from this.tabProxy and this.tabProxyPattern cache
      browser.tabs.onRemoved.addListener((...e) => this.onRemoved(...e));
      // mark incognito/container
      browser.tabs.onCreated.addListener(e => this.checkPageAction(e));
    }
  }

  static init(pref) {
    // (re)initialising: close the gate until the new state is FULLY loaded,
    // including the async storage.session tab-proxy restore.
    this.ready = false;
    const token = ++this.initToken;

    try {
      this.load(pref);
    } catch (e) {
      this.initFailed = true;
      this.flushWaiters(false);
      throw e;
    }

    return this.restoreSession().then(() => {
      // a newer init() superseded this one: it owns the gate now
      if (token !== this.initToken) { return; }
      this.initFailed = false;
      this.ready = true;
      this.flushWaiters(true);
    }).catch(e => {
      if (token !== this.initToken) { return; }
      console.error('FoxyProxy: session restore failed, failing closed', e);
      this.initFailed = true;
      this.flushWaiters(false);
    });
  }

  // mirror as this.tabProxy is lost in MV3 background unloading
  static async restoreSession() {
    const i = await browser.storage.session.get();
    this.tabProxy = i.tabProxy || {};
    this.tabProxyPattern = i.tabProxyPattern || {};
  }

  static load(pref) {
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

        // used for setAction
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
      // prefix key: firefox-default | firefox-container-* | firefox-private (incognito key is used instead)
      (key === 'default' || key.startsWith('container-')) && (key = 'firefox-' + key);
      this.container[key] = val && data.find(i => val === `${i.hostname}:${i.port}`);
    });
  }

  static process(e) {
    // --- readiness gate: never evaluate rules from uninitialised state.
    // Before init completes, hold the request on a Promise; Gecko awaits it
    // (ProxyChannelFilter.applyFilter: `let ret = await this.listener(data)`).
    // Once ready this is a plain synchronous call, identical to before.
    if (!this.ready) { return this.processWhenReady(e); }

    // A throwing listener (e.g. an invalid RegExp in a user pattern) makes
    // Firefox fall back to DIRECT (bug 1528873). Fail closed instead.
    try {
      return this.route(e);
    } catch (err) {
      console.error(`FoxyProxy: routing error, failing closed: ${e.url}`, err);
      return this.BLOCK();
    }
  }

  static route(e) {
    // https://github.com/foxyproxy/browser-extension/issues/218
    // https://bugzilla.mozilla.org/show_bug.cgi?id=2056961
    // Service worker requests from a tab have tabId of -1
    const tabId = e.tabId;
    const fromTab = tabId !== -1;

    // --- check Tab Proxy Pattern (not for tabId -1)
    fromTab && this.processTabProxyPattern(tabId, e.url, e);

    switch (true) {
      // --- check local & global passthrough
      case this.bypass(e.url):
        this.setAction(e);
        return {type: 'direct'};

      // --- tab proxy
      case fromTab && !!this.tabProxy[tabId]:
        return this.processProxy(e, this.tabProxy[tabId]);

      // --- tab proxy by pattern
      case fromTab && !!this.tabProxyPattern[tabId]:
        return this.processProxy(e, this.tabProxyPattern[tabId]);

      // --- incognito proxy
      case e.incognito && !!this.container.incognito:
        return this.processProxy(e, this.container.incognito);

      // --- container proxy
      case e.cookieStoreId && !!this.container[e.cookieStoreId]:
        return this.processProxy(e, this.container[e.cookieStoreId]);

      // --- standard operation
      // pass direct
      case this.mode === 'disable':
      case this.mode === 'direct':
      // PAC URL is set
      case this.mode.includes('://') && !/:\d+$/.test(this.mode):
        this.setAction(e);
        return {type: 'direct'};

      // check if url matches patterns
      case this.mode === 'pattern':
        return this.processPattern(e);

      // get the proxy for all
      default:
        // single-proxy mode but the proxy is missing/inactive: do not go direct
        return this.proxy ? this.processProxy(e, this.proxy) : this.BLOCK();
    }
  }

  // ---------- readiness gate -----------------------------
  static async processWhenReady(e) {
    const ok = await this.waitReady();
    if (ok) { return this.process(e); }

    // Fail closed. Returning {type: 'direct'}, undefined/null, or rejecting
    // would all make ProxyChannelFilter.applyFilter fall through to the
    // default proxy info (DIRECT when proxy.settings is cleared), leaking DNS
    // via the OS resolver. Return a valid ProxyInfo that cannot connect and
    // cannot resolve DNS locally:
    // - IP-literal loopback host: no resolver involved
    // - proxyDNS: true: hostname resolution stays on the (dead) SOCKS proxy
    // - port 1: valid (ProxyInfoData requires 1..65535), nothing listens there
    console.error(`FoxyProxy: not initialised, failing closed: ${e.url}`);
    return this.BLOCK();
  }

  static waitReady() {
    if (this.ready) { return Promise.resolve(true); }
    if (this.initFailed) { return Promise.resolve(false); }

    return new Promise(resolve => {
      const waiter = {resolve};
      // init may never run: do not hang the request forever
      waiter.timer = setTimeout(() => {
        this.waiters.delete(waiter);
        resolve(false);
      }, this.initTimeout);
      this.waiters.add(waiter);
    });
  }

  static flushWaiters(ok) {
    for (const {resolve, timer} of this.waiters) {
      clearTimeout(timer);
      resolve(ok);
    }
    this.waiters.clear();
  }

  static processTabProxyPattern(tabId, url, e) {
    // this.tabProxy has priority over this.tabProxyPattern
    if (e.type !== 'main_frame' || this.tabProxy[tabId]) { return; }

    const match = arr => arr.some(i => new RegExp(i, 'i').test(url));
    const proxy = this.mode === 'pattern' && this.data.find(i => match(i.tabProxy));
    proxy ? this.tabProxyPattern[tabId] = proxy : delete this.tabProxyPattern[tabId];

    // also used in popup.js
    browser.storage.session.set({tabProxyPattern: this.tabProxyPattern});
  }

  static processPattern(e) {
    const url = e.url;
    const match = arr => arr.some(i => new RegExp(i, 'i').test(url));
    const proxy = this.data.find(i => !match(i.exclude) && match(i.include));
    if (proxy) {
      return this.processProxy(e, proxy);
    }

    // no match
    this.setAction(e);
    return {type: 'direct'};
  }

  static processProxy(e, proxy) {
    this.setAction(e, proxy);
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
      ...(type.startsWith('socks') && {proxyDNS: proxyDNS ?? true}),

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

    // trailing null: if this proxy is unreachable, fail instead of falling
    // back to the browser-defined proxy / DIRECT
    return [response, null];
  }

  // browser.action here only relates to proxy.onRequest
  static setAction(e, item) {
    const tabId = e.tabId;
    // Set to -1 if the request isn't related to a tab
    if (tabId === -1) { return; }

    // e.type is only set in proxy.onRequest, not from tabs listeners
    // 'beacon', 'csp_report', 'font', 'image', 'imageset', 'json', 'main_frame',
    // 'media', 'object', 'other', 'ping', 'script', 'speculative', 'stylesheet',
    // 'sub_frame', 'web_manifest', 'websocket', 'xml_dtd', 'xmlhttprequest', 'xslt'
    if (e.type && !['main_frame', 'sub_frame', 'script', 'stylesheet'].includes(e.type)) { return; }

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

  // ---------- tab proxy ----------------------------------
  // from proxy.js
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
    this.setAction({tabId: tab.id}, pxy);

    // also used in popup.js
    browser.storage.session.set({tabProxy: this.tabProxy});
  }

  // ---------- update page action -------------------------
  static onRemoved(tabId) {
    const obj = {};

    if (this.tabProxy[tabId]) {
      delete this.tabProxy[tabId];
      obj.tabProxy = this.tabProxy;
    }

    if (this.tabProxyPattern[tabId]) {
      delete this.tabProxyPattern[tabId];
      obj.tabProxyPattern = this.tabProxyPattern;
    }

    // update session storage
    Object.keys(obj) && browser.storage.session.set(obj);
  }

  // ---------- update page action -------------------------
  static onUpdated(tabId, changeInfo, tab) {
    if (changeInfo.status !== 'complete') { return; }

    const pxy = this.tabProxy[tabId];
    pxy ? this.setAction({tabId}, pxy) : this.checkPageAction(tab);
  }

  // ---------- incognito/container ------------------------
  static checkPageAction(tab) {
    // not if tab proxy is set
    if (tab.id === -1 || this.tabProxy[tab.id]) { return; }

    const pxy = tab.incognito ? this.container.incognito : this.container[tab.cookieStoreId];
    pxy && this.setAction({tabId: tab.id}, pxy);
  }
}