// https://source.chromium.org/chromium/chromium/src/+/main:chrome/common/extensions/api/proxy.json
// https://searchfox.org/mozilla-central/source/toolkit/components/extensions/schemas/proxy.json

// https://bugzilla.mozilla.org/show_bug.cgi?id=1804693
// Setting single proxy for all fails
// https://bugs.chromium.org/p/chromium/issues/detail?id=1495756
// Issue 1495756: Support bypassList for PAC scripts in the chrome.proxy API
// https://chromium-review.googlesource.com/c/chromium/src/+/5227338
// Implement bypassList for PAC scripts in chrome.proxy API
// Chrome bypassList applies to 'fixed_servers', not 'pac_script' or URL
// Firefox passthrough applies to all set in proxy.settings.set, i.e. PAC URL
// manual bypass list:
// Chrome: pac_script data, not possible for URL
// Firefox proxy.onRequest

// https://searchfox.org/mozilla-central/source/toolkit/components/extensions/parent/ext-proxy.js#236
// throw new ExtensionError("proxy.settings is not supported on android.");
// https://bugzilla.mozilla.org/show_bug.cgi?id=1725981
// Support proxy.settings API on Android

import {App} from './app.js';
import {Authentication} from './authentication.js';
import {OnRequest} from './on-request.js';
import {Location} from './location.js';
import {Pattern} from './pattern.js';
import {Action} from './action.js';
import {Menus} from './menus.js';

export class Proxy {

  static {
    // from popup.js & options.js
    browser.runtime.onMessage.addListener((...e) => this.onMessage(...e));
  }

  static onMessage(message) {
    // noDataChange comes from popup.js & test.js
    const {id, pref, host, proxy, dark, tab, noDataChange} = message;
    switch (id) {
      case 'setProxy':
        Action.dark = dark;
        this.set(pref, noDataChange);
        break;

      case 'includeHost':
      case 'excludeHost':
        // proxy object reference to pref is lost in chrome when sent from popup.js
        const pxy = pref.data.find(i => i.active && host === `${i.hostname}:${i.port}`);
        this.includeHost(pref, pxy, tab, id);
        break;

      case 'setTabProxy':
        OnRequest.setTabProxy(tab, proxy);
        break;

      case 'getTabProxy':
        // need to return a promise for 'getTabProxy' from popup.js
        return Promise.resolve(OnRequest.tabProxy[tab.id]);

      case 'getIP':
        this.getIP();
        break;
    }
  }

  static async set(pref, noDataChange) {
    // check if proxy.settings is controlled_by_this_extension
    const conf = await this.getSettings();
    // not controlled_by_this_extension
    if (!conf) { return; }

    // --- update authentication data
    noDataChange || Authentication.init(pref.data);

    // --- update menus
    noDataChange || Menus.init(pref);

    // --- check mode
    switch (true) {
      // no proxy, set to disable
      case !pref.data[0]:
        pref.mode = 'disable';
        break;

      // no include pattern, set proxy to the first entry
      case pref.mode === 'pattern' && !pref.data.some(i => i.include[0] || i.exclude[0]):
        const pxy = pref.data[0];
        pref.mode = pxy.type === 'pac' ? pxy.pac : `${pxy.hostname}:${pxy.port}`;
        break;
    }

    App.firefox ? Firefox.set(pref, conf) : Chrome.set(pref);
    Action.set(pref);
  }

  static async getSettings() {
    if (App.android) { return {}; }

    const conf = await browser.proxy.settings.get({});

    // https://developer.chrome.com/docs/extensions/mv3/manifest/icons/
    // https://bugs.chromium.org/p/chromium/issues/detail?id=29683
    // Issue 29683: Extension icons should support SVG (Dec 8, 2009)
    // SVG is not supported by Chrome
    // Firefox: If each one of imageData and path is one of undefined, null or empty object,
    // the global icon will be reset to the manifest icon
    // Chrome -> Error: Either the path or imageData property must be specified.

    // check if proxy.settings is controlled_by_this_extension
    const control = ['controlled_by_this_extension', 'controllable_by_this_extension'].includes(conf.levelOfControl);
    const path = control ? `/image/icon.png` : `/image/icon-off.png`;
    browser.action.setIcon({path});
    !control && browser.action.setTitle({title: browser.i18n.getMessage('controlledByOtherExtensions')});

    // return null if Chrome and no control, allow Firefox to continue regardless
    return !App.firefox && !control ? null : conf;
  }

  // ---------- Include/Exclude Host ----------------------
  static includeHost(pref, proxy, tab, inc) {
    // not for storage.managed
    if (pref.managed) { return; }

    const url = this.getURL(tab.url);
    if (!url) { return; }

    const pattern = url.origin + '/';
    const pat = {
      active: true,
      pattern,
      title: url.hostname,
      type: 'wildcard',
    };

    inc === 'includeHost' ? proxy.include.push(pat) : proxy.exclude.push(pat);
    browser.storage.local.set({data: pref.data});
    // update Proxy, noDataChange
    pref.mode === 'pattern' && proxy.active && this.set(pref, true);
  }

  static getURL(str) {
    const url = new URL(str);
    // unacceptable URLs
    if (!['http:', 'https:'].includes(url.protocol)) { return; }

    return url;
  }

  // from popup.js
  static getIP() {
    fetch('https://getfoxyproxy.org/webservices/lookup.php')
    .then(response => response.json())
    .then(data => {
      if (!Object.keys(data)) {
        App.notify(browser.i18n.getMessage('error'));
        return;
      }

      const [ip, {cc, city}] = Object.entries(data)[0];
      const text = [ip, city, Location.get(cc)].filter(Boolean).join('\n');
      App.notify(text);
    })
    .catch(error => App.notify(browser.i18n.getMessage('error') + '\n\n' + error.message));
  }
}

class Firefox {

  static async set(pref, conf) {
    // update OnRequest
    OnRequest.init(pref);

    if (App.android) { return; }

    // incognito access
    if (!await browser.extension.isAllowedIncognitoAccess()) {
      return;
    }

    // retain settings as Network setting is partially customisable
    const value = conf.value;

    switch (true) {
      // https://github.com/foxyproxy/browser-extension/issues/47
      // Unix domain socket SOCKS proxy support
      // regard file:///run/user/1000/proxy.socks:9999 as normal proxy (not PAC)

      // sanitizeNoProxiesPref() "network.proxy.no_proxies_on"
      // https://searchfox.org/mozilla-central/source/browser/components/preferences/dialogs/connection.js#338

      // --- Proxy Auto-Configuration (PAC) URL
      case pref.mode.includes('://') && !/:\d+$/.test(pref.mode):
        value.proxyType = 'autoConfig';
        value.autoConfigUrl = pref.mode;
        // convert to standard comma-separated
        value.passthrough = pref.passthrough.split(/[\s,;]+/).join(', ');
        value.proxyDNS = pref.proxyDNS;
        // no error if levelOfControl: "controlled_by_other_extensions"
        browser.proxy.settings.set({value});
        break;

      // --- disable, direct, pattern, or single proxy
      default:
        browser.proxy.settings.clear({});
    }
  }
}

class Chrome {

  static async set(pref) {
    // https://developer.chrome.com/docs/extensions/reference/types/
    // Scope and life cycle: regular | regular_only | incognito_persistent | incognito_session_only
    const config = {value: {}, scope: 'regular'};
    switch (true) {
      case pref.mode === 'disable':
      case pref.mode === 'direct':
        config.value.mode = 'system';
        break;

      // --- Proxy Auto-Configuration (PAC) URL
      case pref.mode.includes('://') && !/:\d+$/.test(pref.mode):
        config.value.mode = 'pac_script';
        config.value.pacScript = {mandatory: true};
        config.value.pacScript.url = pref.mode;
        break;

      // --- single proxy
      case pref.mode.includes(':'):
        const pxy = this.findProxy(pref);
        if (!pxy) { return; }

        config.value.mode = 'fixed_servers';
        config.value.rules = this.getSingleProxyRule(pref, pxy);
        break;

      // --- pattern
      default:
        config.value.mode = 'pac_script';
        config.value.pacScript = {mandatory: true};
        config.value.pacScript.data = this.getPacString(pref);
    }

    browser.proxy.settings.set(config);

    // --- incognito
    this.setIncognito(pref);
  }

  static findProxy(pref, host = pref.mode) {
    return pref.data.find(i =>
      i.active && i.type !== 'pac' && i.hostname && host === `${i.hostname}:${i.port}`);
  }

  static async setIncognito(pref) {
    // incognito access
    if (!await browser.extension.isAllowedIncognitoAccess()) {
      return;
    }

    const pxy = pref.container?.incognito && this.findProxy(pref, pref.container?.incognito);
    if (!pxy) {
      // unset incognito
      browser.proxy.settings.clear({scope: 'incognito_persistent'});
      return;
    }

    const config = {value: {}, scope: 'incognito_persistent'};
    config.value.mode = 'fixed_servers';
    config.value.rules = this.getSingleProxyRule(pref, pxy);
    browser.proxy.settings.set(config);
  }

  static getSingleProxyRule(pref, pxy) {
    return {
      singleProxy: {
        scheme: pxy.type,
        host: pxy.hostname,
        // must be number, prepare for augmented port
        port: parseInt(pxy.port),
      },
      bypassList: pref.passthrough ? pref.passthrough.split(/[\s,;]+/) : []
    };
  }

  static getProxyString(proxy) {
    let {type, hostname, port} = proxy;
    switch (type) {
      case 'direct':
        return 'DIRECT';

      // chrome PAC doesn't support HTTP
      case 'http':
        type = 'PROXY';
        break;

      default:
        type = type.toUpperCase();
    }
    // prepare for augmented port
    return `${type} ${hostname}:${parseInt(port)}`;
  }

  static getPacString(pref) {
    // --- proxy by pattern
    const [passthrough, net] = Pattern.getPassthrough(pref.passthrough);

    // filter data
    let data = pref.data.filter(i => i.active && i.type !== 'pac' && i.hostname);
    data = data.filter(i => i.include[0] || i.exclude[0]).map(item => {
      return {
        str: this.getProxyString(item),
        include: item.include.filter(i => i.active).map(i => Pattern.get(i.pattern, i.type)),
        exclude: item.exclude.filter(i => i.active).map(i => Pattern.get(i.pattern, i.type))
      };
    });

    // add PAC rules from pacString
    let pacData = pref.data.filter(i => i.active && i.type === 'pac' && i.pacString);
    pacData = pacData.map((i, idx) => i.pacString.replace('FindProxyForURL', '$&' + idx) +
`\nconst find${idx} = FindProxyForURL${idx}(url, host);
if (find${idx} !== 'DIRECT') { return find${idx}; }`).join('\n\n');
    pacData &&= `\n${pacData}\n`;

    // https://developer.chrome.com/docs/extensions/reference/proxy/#type-PacScript
    // https://github.com/w3c/webextensions/issues/339
    // Chrome pacScript doesn't support bypassList
    // https://issues.chromium.org/issues/40286640

    // isInNet(host, "192.0.2.172", "255.255.255.255")

    const pacString =
String.raw`function FindProxyForURL(url, host) {
  const data = ${JSON.stringify(data)};
  const passthrough = ${JSON.stringify(passthrough)};
  const net = ${JSON.stringify(net)};
  const match = array => array.some(i => new RegExp(i, 'i').test(url));
  const inNet = () => net[0] && /^[\d.]+$/.test(host) && net.some(([ip, mask]) => isInNet(host, ip, mask));

  if (match(passthrough) || inNet()) { return 'DIRECT'; }
  for (const proxy of data) {
    if (!match(proxy.exclude) && match(proxy.include)) { return proxy.str; }
  }
  ${pacData}
  return 'DIRECT';
}`;

    return pacString;
  }
}