// https://bugs.chromium.org/p/chromium/issues/detail?id=1198822
// Dynamic import is not available yet in MV3 service worker
// Once implemented, module will be dynamically imported for Firefox only

// https://bugzilla.mozilla.org/show_bug.cgi?id=1794464
// proxyAuthorizationHeader on Firefox only applies to HTTPS (not HTTP and it breaks the API and sends DIRECT)
// proxy.onRequest user/pass on Firefox only applies to SOCKS (not HTTP/HTTPS)
/*
  proxy.onRequest
  {
    type: direct | http | https | socks | socks4
    host:
    port:
    username:
    password:
    failoverTimeout:
    proxyAuthorizationHeader:
    connectionIsolationKey:
  }
*/

// ----------------- Firefox Proxy Process -----------------
class OnRequest {

  constructor() {
    if (typeof browser === 'undefined' || !browser.proxy.onRequest) { return; } // Firefox Only

    // values will be set in PAC in proxy.js
    this.mode = 'disable';                                  // default start
    this.proxy = null;                                      // needed only in Single Proxy
    this.data = [];                                         // needed only in Proxy by Pattern
    this.globalExclude = [];
    this.proxyDNS = true;                                   // default true
    browser.proxy.onRequest.addListener(e => this.process(e), {urls: ['<all_urls>']});
  }

  process(e) {
    // --- check mode
    switch (true) {
      case this.mode === 'disable':                         // pass direct
      case this.mode.includes('://'):                       // PAC URL is set
      case this.globalExclude.some(i => new RegExp(i, 'i').test(e.url)): // global exclude
        return {type: 'direct'};

      case this.mode === 'pattern':                         // check if url matches patterns
        return this.processPattern(e.url);

      default:                                              // get the proxy for all
        return this.processProxy(this.proxy);
    }
  }

  processPattern(url)  {
    if (!this.data[0]) { return {type: 'direct'}; }

    const match = array => array.some(i => new RegExp(i, 'i').test(url));
    for (const proxy of this.data) {
      if (!match(proxy.exclude) && match(proxy.include)) { return this.processProxy(proxy); }
    }

    return {type: 'direct'};                                // no match
  }

  processProxy(proxy) {
    if (!proxy) { return {type: 'direct'}; }

    const {type, hostname: host, port, username, password} = proxy;
    const res = {type, host, port};

    // https://searchfox.org/mozilla-central/source/toolkit/components/extensions/ProxyChannelFilter.jsm#49
    // API uses socks for socks5
    res.type === 'socks5' && (res.type = 'socks');

    // https://searchfox.org/mozilla-central/source/toolkit/components/extensions/ProxyChannelFilter.jsm#141
    type.startsWith('socks') && (res.proxyDNS = this.proxyDNS);

    if (username && password) {
      res.username = username;
      res.password = password;
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1794464
      // Allow HTTP authentication in proxy.onRequest
      // https://searchfox.org/mozilla-central/source/toolkit/components/extensions/ProxyChannelFilter.jsm#173
      type === 'https' && (res.proxyAuthorizationHeader = 'Basic ' + btoa(proxy.username + ':' + proxy.password));
    }

    console.log(res);
    return res;
  }
}
export const onRequest = new OnRequest();
