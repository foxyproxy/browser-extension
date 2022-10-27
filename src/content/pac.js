import {App} from './app.js';
import {Location} from './location.js';
import {Pattern} from './pattern.js';
import {onRequest} from './on-request.js';

export class PAC {

  static setPAC(pref, proxy) {
    const config = {};
    switch (pref.mode) {
      case 'disable':
        break;

      case 'pattern':
        pref.data[0] && (config.pacString = this.getPacString(pref));
        break;

      default:
        proxy = proxy || this.findProxy(pref);
        if (proxy) {
          config.proxy = proxy;
          proxy.pac || (config.pacString = this.getPacString(pref, proxy)); // pac URL or single proxy
        }
    }

    App.firefox && (onRequest.mode = pref.mode);            // Firefox only
    this.setProxySettings(pref, config);
  }

  static findProxy(pref) {
    const pac = pref.mode.includes('://');                  // type pac
    return pref.data.find(item => item.active && pref.mode === (pac ? item.pac :`${item.hostname}:${item.port}`)); // save as a.b.c:443
  }

  static getProxyString(proxy) {
    let {type, hostname, port} = proxy;
    switch (type) {
      case 'http': type = 'PROXY'; break;                   // chrome PAC doesn't support HTTP
      // case 'socks': type = 'SOCKS5'; break;                 // convert to SOCKS5 as SOCKS in PAC means SOCKS4
      default: type = type.toUpperCase();
    }
    return `${type} ${hostname}:${port}`;
  }

  static getPacString(pref, proxy) {
    const globalExclude = [
      ...pref.globalExcludeWildcard.split(/\n+/).map(i => Pattern.get(i, 'wildcard')),
      ...pref.globalExcludeRegex.split(/\n+/)
    ].filter(Boolean);

    if (App.firefox) {
      onRequest.globalExclude = globalExclude;
      onRequest.proxy = proxy;
      onRequest.proxyDNS = pref.proxyDNS;
      // --- proxy by pattern
      if (!proxy) {
        onRequest.data = pref.data.filter(i => i.active && i.hostname && (i.include[0] || i.exclude[0])).map(item => {
          return {
            type: item.type,
            hostname: item.hostname,
            port: item.port,
            username: item.username,
            password: item.password,
            include: item.include.filter(i => i.active).map(i => Pattern.get(i.pattern, i.type)),
            exclude: item.exclude.filter(i => i.active).map(i => Pattern.get(i.pattern, i.type))
          }
        });
      }
      console.log(onRequest);
      return;
    }

    // --- single proxy
    if (proxy) {
      const pacString =
`function FindProxyForURL(url, host) {
  const globalExclude = ${JSON.stringify(globalExclude)};
  return globalExclude.some(i => new RegExp(i, 'i').test(url)) ? 'DIRECT' : '${this.getProxyString(proxy)}';
}`;
      return pacString;
    }
/*
    {
      "title": "example",
      "pattern": "*://*.example.com",
      "type": 'wildcard',
      "active": true,
    }
*/
    // --- proxy by pattern
    const data = pref.data.filter(i => i.active && i.hostname && (i.include[0] || i.exclude[0])).map(item => {
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
  const match = array => array.some(i => new RegExp(i.regex, 'i').test(url));

  if (match(globalExclude)) { return 'DIRECT'; }
  for (const proxy of data) {
    if (!match(proxy.exclude) && match(proxy.include)) { return proxy.str; }
  }
  return 'DIRECT';
}`;

    return pacString;
  }

  static async setProxySettings(pref, {proxy, pacString}) {
    // https://developer.chrome.com/docs/extensions/reference/types/
    // Scope and life cycle: regular | regular_only | incognito_persistent | incognito_session_only
    // Firefox Only: retain settings as Network setting is partially customisable
    const conf = App.firefox && await browser.proxy.settings.get({});
    const config = App.firefox ? {value: conf.value} : {value: {}, scope: 'regular'};

    switch (true) {
      case App.chrome && !proxy && !pacString:              // disable
        config.value.mode = 'system';
        break;

      case App.firefox && !proxy?.pac:                      // disable
        config.value.proxyType = 'system';
        break;

      case App.chrome:
        config.value.mode = 'pac_script';
        config.value.pacScript = {mandatory: true};
        proxy?.pac && (config.value.pacScript.url = proxy.pac);
        pacString && (config.value.pacScript.data = pacString);
        break;

      case App.firefox:                                     // pac type
        config.value.proxyType = 'autoConfig';
        config.value.autoConfigUrl = proxy.pac;
        config.value.proxyDNS = pref.proxyDNS;
        break;
    }

    console.log(config);
    browser.proxy.settings.set(config);
    this.action(pref.mode, proxy);

    // https://source.chromium.org/chromium/chromium/src/+/main:chrome/common/extensions/api/proxy.json
    // chrome.proxy.settings not promise yet
    // Uncaught TypeError: Error in invocation of types.ChromeSetting.get(object details, function callback): No matching signature.
    // App.chrome ? chrome.proxy.settings.get({}, console.log) : browser.proxy.settings.get({}).then(console.log);
  }

  static action(mode, proxy) {
    // default color (Chrome doesn't accept null)
    // const color = proxy ? proxy.color : null;
    const color = proxy ? proxy.color : '#ff9900';
    const text = proxy ? proxy.title || mode : '';
    const title = proxy ? this.getTitleLocation(proxy) : '';

    // https://bugs.chromium.org/p/chromium/issues/detail?id=29683
    // https://developer.chrome.com/docs/extensions/mv3/manifest/icons/
    // SVG is not supported by Chrome
    const ext = App.chrome ? 'png' : 'svg';

    // Firefox: If each one of imageData and path is one of undefined, null or empty object,
    // the global icon will be reset to the manifest icon
    // Chrome -> Error: Either the path or imageData property must be specified.
    // const path = mode === 'disable' ? `/image/icon-off.${ext}` : '';
    const path = mode === 'disable' ? `/image/icon-off.${ext}` : `/image/icon.${ext}`;

    browser.action.setBadgeBackgroundColor({color});
    browser.action.setBadgeText({text});
    browser.action.setTitle({title});
    browser.action.setIcon({path});
  }

  static getTitleLocation(item) {
    return [App.getTitle(item), Location.get(item)].filter(Boolean).join('\n');
  }
}
