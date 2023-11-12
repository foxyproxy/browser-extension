// https://bugs.chromium.org/p/chromium/issues/detail?id=1198822
// Dynamic import is not available yet in MV3 service worker
// Once implemented, module will be dynamically imported for Firefox only

// Support non-ASCII username/password for socks proxy
// https://bugzilla.mozilla.org/show_bug.cgi?id=1853203
// Fixed in Firefox 119

import {Pattern} from './pattern.js';
import {PageAction} from './page-action.js';

// ---------- Firefox Proxy Process ------------------------
export class OnRequest {

  static {
    // --- default values
    this.mode = 'disable';
    this.proxy = null;                                      // used for Single Proxy
    this.data = [];                                         // used for Proxy by Pattern
    this.passthrough = [];                                  // RegExp string
    this.net = [];                                          // [start, end] strings
    this.proxyDNS = true;
    this.tabProxy = {};                                     // tab proxy, may be lost in MV3 if bg is unloaded
    this.container = {};                                    // incognito/container proxy

    // --- Firefox only
    if (browser?.proxy?.onRequest) {
      browser.proxy.onRequest.addListener(e => this.process(e), {urls: ['<all_urls>']});
      // check Tab for tab proxy
      browser.tabs.onUpdated.addListener((...e) => this.onUpdated(...e));
      browser.tabs.onRemoved.addListener(tabId => delete this.tabProxy[tabId]);
      // mark incognito/container
      browser.tabs.onCreated.addListener(e => this.checkPageAction(e));
    }
  }

  static init(pref) {
    this.mode = pref.mode;
    const [passthrough, , net] = Pattern.getPassthrough(pref.passthrough);
    this.passthrough = passthrough;
    this.net = net;

    this.proxyDNS = pref.proxyDNS;                          // used in mode pattern or single proxy

    const data = pref.data.filter(i => i.active && i.type !== 'pac' && i.hostname); // filter data

    // --- single proxy
    /:\d+$/.test(pref.mode) && (this.proxy = data.find(i => pref.mode === `${i.hostname}:${i.port}`));

    // --- proxy by pattern
    this.data = data.filter(i => i.include[0] || i.exclude[0]).map(item => {
      return {
        type: item.type,
        hostname: item.hostname,
        port: item.port,
        username: item.username,
        password: item.password,
        include: item.include.filter(i => i.active).map(i => Pattern.get(i.pattern, i.type)),
        exclude: item.exclude.filter(i => i.active).map(i => Pattern.get(i.pattern, i.type))
      };
    });

    // --- incognito/container proxy
    pref.container && Object.entries(pref.container).forEach(([key, val]) => {
      key.startsWith('container-') && (key = 'firefox-' + key); // prefix key
      this.container[key] = val && data.find(i => val === `${i.hostname}:${i.port}`);
    });
  }

  static process(e) {
    switch (true) {
      // --- check local & global passthrough
      case this.bypass(e.url):
        return {type: 'direct'};

      // --- tab proxy
      case e.tabId !== -1 && !!this.tabProxy[e.tabId]:
        return this.processProxy(this.tabProxy[e.tabId]);

      // --- incognito proxy
      case e.tabId !== -1 && e.incognito && !!this.container.incognito:
        return this.processProxy(this.container.incognito);

      // --- container proxy
      case e.tabId !== -1 && e.cookieStoreId && !!this.container[e.cookieStoreId]:
        return this.processProxy(this.container[e.cookieStoreId]);

      // --- standard operation
      case this.mode === 'disable':                         // pass direct
      case this.mode === 'direct':                          // pass direct
      case this.mode.includes('://'):                       // PAC URL is set
        return {type: 'direct'};

      case this.mode === 'pattern':                         // check if url matches patterns
        return this.processPattern(e.url);

      default:                                              // get the proxy for all
        return this.processProxy(this.proxy);
    }
  }

  static processPattern(url) {
    const match = array => array.some(i => new RegExp(i, 'i').test(url));

    for (const proxy of this.data) {
      if (!match(proxy.exclude) && match(proxy.include)) { return this.processProxy(proxy); }
    }

    return {type: 'direct'};                                // no match
  }

  static processProxy(proxy) {
    const {type, hostname: host, port, username, password} = proxy;
    if (type === 'direct') { return {type: 'direct'}; }

    const response = {type, host, port};

    // https://searchfox.org/mozilla-central/source/toolkit/components/extensions/ProxyChannelFilter.sys.mjs#49
    // API uses socks for socks5
    response.type === 'socks5' && (response.type = 'socks');

    // https://searchfox.org/mozilla-central/source/toolkit/components/extensions/ProxyChannelFilter.sys.mjs#141
    type.startsWith('socks') && (response.proxyDNS = this.proxyDNS);

    if (username && password) {
      response.username = username;
      response.password = password;
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1794464
      // Allow HTTP authentication in proxy.onRequest
      // https://searchfox.org/mozilla-central/source/toolkit/components/extensions/ProxyChannelFilter.sys.mjs#173
      // proxyAuthorizationHeader on Firefox only applies to HTTPS (not HTTP and it breaks the API and sends DIRECT)
      // proxyAuthorizationHeader added to reduce the authentication request in webRequest.onAuthRequired
      type === 'https' && (response.proxyAuthorizationHeader = 'Basic ' + btoa(proxy.username + ':' + proxy.password));
    }

    return response;
  }

  // ---------- passthrough --------------------------------
  static bypass(url) {
    switch (true) {
      case this.localhost(url):                             // localhost passthrough
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
  static localhost(url) {
    const [, host] = url.split(/:\/\/|\//, 2);              // hostname with/without port
    const isIP = /^[\d.:]+$/.test(host);

    switch (true) {
      // --- localhost & <local>
      // case host === 'localhost':
      case !host.includes('.'):                             // plain hostname (no dots)
      case host.endsWith('.localhost'):                     // *.localhost

      // --- IPv4
      // case host === '127.0.0.1':
      case isIP && host.startsWith('127.'):                 // 127.0.0.1 up to 127.255.255.254
      case isIP && host.startsWith('169.254.'):             // 169.254.0.0/16
      case isIP && host.startsWith('192.168.'):             // 192.168.0.0/16   192.168.0.0   192.168.255.255

      // --- IPv6
      // case host === '[::1]':
      case host.startsWith('[::1]'):                        // literal IPv6 [::1]:80 with/without port
      case host.startsWith('[FE80::]'):                     // literal IPv6 [FE80::]/10
        return true;
    }
  }

  static isInNet(url) {
    // check if IP address
    if(!/^[a-z]+:\/\/\d+(\.\d+){3}(:\d+)?\//.test(url)) { return; }

    const ipa = url.split(/[:/.]+/, 5).slice(1);            // IP array
    const ip = ipa.map(i => i.padStart(3, '0')).join('');   // convert to padded string
    return this.net.some(([st, end]) => ip >= st && ip <= end);
  }

  // ---------- Tab Proxy ----------------------------------
  static async setTabProxy(pxy) {
    const [tab] = await browser.tabs.query({currentWindow: true, active: true});
    switch (true) {
      case !/https?:\/\/.+/.test(tab.url):                  // unacceptable URLs
      case this.bypass(tab.url):                            // check local & global passthrough
        return;
    }

    this.tabProxy[tab.id] = pxy;
    PageAction.set(tab.id, pxy);
  }

  static async unsetTabProxy() {
    const [tab] = await browser.tabs.query({currentWindow: true, active: true});
    delete this.tabProxy[tab.id];
    PageAction.unset(tab.id);
  }

  // ---------- Incognito/Container ------------------------
  static checkPageAction(tab) {
    if (tab.id === -1 || this.tabProxy[tab.id]) { return; } // not if tab proxy is set

    const pxy = tab.incognito ? this.container.incognito : this.container[tab.cookieStoreId];
    pxy && PageAction.set(tab.id, pxy);
  }

  // ---------- Update Page Action -------------------------
  static onUpdated(tabId, changeInfo, tab) {
    if (changeInfo.status !== 'complete') { return; }

    const pxy = this.tabProxy[tab.id];
    pxy ? PageAction.set(tab.id, pxy) : this.checkPageAction(tab);
  }
}