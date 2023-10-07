import {App} from './app.js';
import {Pattern} from './pattern.js';
import {Authentication} from './authentication.js';
import {OnRequest} from './on-request.js';
import {Action} from './action.js';

export class Proxy {

  static {
    browser.runtime.onMessage.addListener((...e) => this.onMessage(...e)); // from popup options
  }

  static onMessage(message) {
    const {id, pref, host, proxy} = message;
    switch (id) {
      case 'setProxy':
        this.set(pref);
        break;

      case 'quickAdd':
        this.quickAdd(pref, host);
        break;

      case 'excludeHost':
        this.excludeHost(pref);
        break;

      case 'setTabProxy':
        OnRequest.setTabProxy(proxy);
        break;

      case 'unsetTabProxy':
        OnRequest.unsetTabProxy();
        break;
    }
  }

  static set(pref) {
    // --- update authentication data
    Authentication.init(pref.data);

    // --- check mode
    switch (true) {
      // no proxy, set to disable
      case !pref.data[0]:
        pref.mode = 'disable';
        break;

      // no include pattern, set proxy to the first entry
      case pref.mode === 'pattern' && !pref.data.some(i => i.include[0] || i.exclude[0]):
        const pxy = pref.data[0]
        pref.mode = pxy.type === 'pac' ? pxy.pac : `${i.hostname}:${i.port}`;
        break;
    }

    App.firefox ? this.setFirefox(pref) : this.setChrome(pref);
    Action.set(pref);
  }

  static async getSettings() {
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1725981
    // proxy.settings is not supported on Android
    if (!browser.proxy.settings) {
      return {value: {}};
    }

    const conf = await browser.proxy.settings.get({});

    // https://developer.chrome.com/docs/extensions/mv3/manifest/icons/
    // https://bugs.chromium.org/p/chromium/issues/detail?id=29683
    // Issue 29683: Extension icons should support SVG (Dec 8, 2009)
    // SVG is not supported by Chrome
    // Firefox: If each one of imageData and path is one of undefined, null or empty object,
    // the global icon will be reset to the manifest icon
    // Chrome -> Error: Either the path or imageData property must be specified.

    // check if proxy.settings is controlled_by_this_extension
    const ext = App.firefox ? 'svg' : 'png';
    const path = conf.levelOfControl === 'controlled_by_this_extension' ? `/image/icon.${ext}` : `/image/icon-off.${ext}`;
    browser.action.setIcon({path});

    return conf;
  }

  static async setFirefox(pref) {
    // proxy.settings is not supported on Android
    // retain settings as Network setting is partially customisable
    const conf = await this.getSettings();
    const value = conf.value;
    OnRequest.init(pref);
    switch (true) {
      case pref.mode === 'disable':
        value.proxyType = 'system';
        browser.proxy.settings?.set({value});
        break;

      // Automatic proxy configuration URL
      case pref.mode.includes('://'):
        value.proxyType = 'autoConfig';
        value.autoConfigUrl = pref.mode;
        browser.proxy.settings?.set({value});
        break;

      // pattern or single proxy
      default:
        value.proxyType = 'system';
        browser.proxy.settings?.set({value});
    }
  }

  static setChrome(pref) {
    // check if proxy.settings is controlled_by_this_extension
    this.getSettings();

    // https://developer.chrome.com/docs/extensions/reference/types/
    // Scope and life cycle: regular | regular_only | incognito_persistent | incognito_session_only
    const config = {value: {}, scope: 'regular'};
    switch (true) {
      case pref.mode === 'disable':
        config.value.mode = 'system';
        break;

      // Automatic proxy configuration URL
      case pref.mode.includes('://'):
        config.value.mode = 'pac_script';
        config.value.pacScript = {mandatory: true};
        config.value.pacScript.url = pref.mode;
        break;

      // pattern or single proxy
      default:
        config.value.mode = 'pac_script';
        config.value.pacScript = {mandatory: true};
        config.value.pacScript.data = this.getPacString(pref);
    }

    browser.proxy.settings.set(config);
  }

  static getPacString(pref) {
    // mode: pattern or single proxy
    const globalExclude = [
      ...pref.globalExcludeWildcard.split(/\n+/).map(i => Pattern.get(i, 'wildcard')),
      ...pref.globalExcludeRegex.split(/\n+/)
    ].filter(Boolean);

    // filter data
    let data = pref.data.filter(i => i.active && i.type !== 'pac' && i.hostname);

    // --- single proxy
    if (pref.mode !== 'pattern') {
      const proxy = data.find(i => pref.mode === `${i.hostname}:${i.port}`);
      const pacString =
`function FindProxyForURL(url, host) {
  const globalExclude = ${JSON.stringify(globalExclude)};
  return globalExclude.some(i => new RegExp(i, 'i').test(url)) ? 'DIRECT' : '${this.getProxyString(proxy)}';
}`;
      return pacString;
    }

    // --- proxy by pattern
    data = data.filter(i => i.include[0] || i.exclude[0]).map(item => {
      return {
        str: this.getProxyString(item),
        include: item.include.filter(i => i.active).map(i => Pattern.get(i.pattern, i.type)),
        exclude: item.exclude.filter(i => i.active).map(i => Pattern.get(i.pattern, i.type))
      }
    });

    const pacString =
`function FindProxyForURL(url, host) {
  const data = ${JSON.stringify(data)};
  const globalExclude = ${JSON.stringify(globalExclude)};
  const match = array => array.some(i => new RegExp(i, 'i').test(url));

  if (match(globalExclude)) { return 'DIRECT'; }
  for (const proxy of data) {
    if (!match(proxy.exclude) && match(proxy.include)) { return proxy.str; }
  }
  return 'DIRECT';
}`;

    return pacString;
  }

  static getProxyString(proxy) {
    let {type, hostname, port} = proxy;
    switch (type) {
      case 'direct':
        return 'DIRECT';

      case 'http':
        type = 'PROXY';                                     // chrome PAC doesn't support HTTP
        break;

      // case 'socks':
      //   type = 'SOCKS5';                                    // convert to SOCKS5 as SOCKS in PAC means SOCKS4
      //   break;

      default:
        type = type.toUpperCase();
    }
    return `${type} ${hostname}:${port}`;
  }

  // ---------- Quick Add/Exclude Host ---------------------
  static async quickAdd(pref, host) {
    const activeTab = await this.getActiveTab();
    const url = this.getURL(activeTab[0].url);
    if (!url) { return; }

    const pat = {
      active: true,
      pattern: `^${url.origin}/`,
      title: url.hostname,
      type: 'regex',
    };

    const pxy = pref.data.find(i => host === `${i.hostname}:${i.port}`);
    if (!pxy) { return; }

    pxy.include.push(pat);
    browser.storage.local.set({data: pref.data});
    pref.mode === 'pattern' && pxy.active && this.set(pref); // update Proxy
  }

  static async excludeHost(pref, tab) {
    const activeTab = tab || await this.getActiveTab();
    const url = this.getURL(activeTab[0].url);
    if (!url) { return; }

    // add host pattern, remove duplicates
    const pat = `^${url.origin}/`;
    const exclude = pref.globalExcludeRegex.split(/[\r\n]+/);
    if (exclude.includes(pat)) { return; }

    exclude.push(pat);
    pref.globalExcludeRegex  = [...new Set(exclude)].join('\n').trim();
    browser.storage.local.set({globalExcludeRegex: pref.globalExcludeRegex});
    this.set(pref);                                         // update Proxy
  }

  static async getActiveTab() {
    return browser.tabs.query({currentWindow: true, active: true});
  }

  static getTabURL(str) {
    const url = new URL(str);
    return ['http:', 'https:'].includes(url.protocol) ? url : null; // acceptable URLs
  }
}