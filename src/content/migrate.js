/*
  ----- Patterns -----
  Chrome FoxyProxy v3 (old) featured full/partial url match pattern
  Firefox FoxyProxy v4 - v7 (old) featured host only match pattern
  - Migrating v4 - v7 storage data to full/partial url match pattern
  - Dropping select for http|https|all

  ----- SOCKS keyword -----
  https://developer.chrome.com/docs/extensions/reference/proxy/#proxy-rules
  https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/proxy/ProxyInfo
  https://chromium.googlesource.com/chromium/src/+/HEAD/net/docs/proxy.md#http-proxy-scheme
  Chrome PAC schemes  PROXY | HTTPS | SOCKS4/SOCKS | SOCKS5
  Chrome API schemes  http | https | socks4 | socks5 | quic

  Firefox PAC schemes PROXY/HTTP | HTTPS | SOCKS4/SOCKS | SOCKS5
  Firefox API types   http | https | socks4 | socks (means socks5) | direct

  Firefox/Chrome PAC 'SOCKS' means SOCKS4
  Firefox API 'SOCKS' means SOCKS5
  Code uses PAC 'SOCKS4/5' but converts to socks in Firefox API

  ----- host/hostname keywords -----
  Firefox/Chrome API/PAC use 'host' for domain/ip
  JavaScript uses 'hostname' for for domain/ip & 'host' for domain:port/ip:port
  Code uses JavaScript 'hostname' domain/ip
*/

import {App} from './app.js';
import {Pattern} from './pattern.js';
import {Color} from './color.js';

/*
  Chrome v3 (old) encrypts username/passwords using CryptoJS 3.1.2
  CryptoJS library is used to migrate preferences to v8.0 but will be removed in future upgrades
  Original CryptoJS 3.1.2 aes.js  https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.2/rollups/aes.js
  `export {CryptoJS};` was added to be able to import as ES6 module
*/
// removed in v9.0
// import {CryptoJS} from '../lib/aes.3.1.2.js';

export class Migrate {

  static async init(pref) {
    // --- 8.9
    // 8.9 remove showPatternProxy (from 8.7)
    // 8.8 tidy up left-over obj Sync typo mistake (from 8.0)
    // 8.7 change global proxyDNS to per-proxy (from 8.0)
    if (Object.hasOwn(pref, 'proxyDNS') && pref.data) {
      pref.data.forEach(i => i.proxyDNS = !!pref.proxyDNS);
      await browser.storage.local.set(pref);
    }
    // 8.1 remove globalExcludeWildcard, globalExcludeRegex (from 8.0)
    const keys = ['showPatternProxy', 'obj', 'proxyDNS', 'globalExcludeWildcard', 'globalExcludeRegex'];
    keys.forEach(i => delete pref[i]);
    await browser.storage.local.remove(keys);
    await browser.storage.sync.remove(keys);

    // --- 8.0
    if (pref.data) { return; }

    let db = {};
    switch (true) {
      case !Object.keys(pref)[0]:
        db = App.getDefaultPref();
        break;

      case Object.hasOwn(pref, 'settings'):
        db = this.convert3(pref);
        break;

      default:
        db = this.convert7(pref);
    }

    if (Object.keys(pref)[0]) {
      // clear pref
      Object.keys(pref).forEach(i => delete pref[i]);
      await browser.storage.local.clear();
    }

    // populate pref
    Object.keys(db).forEach(i => pref[i] = db[i]);

    // --- update database
    await browser.storage.local.set(pref);
    // return pref;
  }

  // static decrypt(str, key) {
  //   return CryptoJS.AES.decrypt(str, key).toString(CryptoJS.enc.Utf8).split(/(?<!\\):/).map(i => i.replace(/\\:/g, ':'));
  // }

  // --- Chrome v3
  static convert3(pref) {
    // https://groups.google.com/a/chromium.org/g/chromium-extensions/c/6qiMo0P-XS4
    // mode in v3 was saved to localStorage and not accessible in MV3 service worker

    // new database format
    const db = App.getDefaultPref();
    db.sync = !!pref?.settings?.useSyncStorage;

    // CryptoJS key
    // const sk = pref.settings.sk;
    pref.proxyList?.forEach(key => {
      const item = pref[key].data;
      // skip
      if (key === 'default' || !item?.patterns) { return; }
      // convert to actual type: http | https | socks4 | socks5 | + PAC
      // default HTTP (no HTTPS option in FP Chrome v3)
      const type = item.isSocks ? (item.socks === '5' ? 'socks5' : 'socks4') :
        (item.type === 'auto' ? 'pac' : 'http');

      // removed in v9.0
      // decrypt username, password
      // const [username = '', password = ''] = sk ? this.decrypt(item.credentials, sk) : [];

      // proxy template
      const pxy = {
        active: item.enabled,
        title: item.name || '',
        type,
        // rename to hostname
        hostname: item.host,
        port: item.port,
        username: '',
        password: '',
        // remove country, use CC in location.js
        cc: '',
        city: '',
        color: item.color || Color.getRandom(),
        pac: type === 'pac' ? item.configUrl : '',
        pacString: '',
        proxyDNS: true,
        include: [],
        exclude: [],
        tabProxy: [],
      };

      // process include/exclude
      item.patterns.forEach(elem => {
        const p = elem.data;
        // skip
        if (!p?.type) { return; }

        const pat = {
          active: true,
          // v3 keep patterns as they are
          pattern: p.url,
          title: p.name || '',
          // uses wildcard | regexp  -> change to regex
          type: p.type === 'wildcard' ? 'wildcard' : 'regex'
        };

        // Validate RegExp, deactivate on error
        !Pattern.validate(pat.pattern, pat.type) && (pat.active = false);

        // whitelist: Inclusive/Exclusive
        p.whitelist === 'Inclusive' ? pxy.include.push(pat) : pxy.exclude.push(pat);
      });

      db.data.push(pxy);
    });

    return db;
  }

  // --- Firefox v6-7 (also used in Options -> Import Older Export)
  static convert7(pref) {
    const typeSet = {
      1: 'http',    // PROXY_TYPE_HTTP
      2: 'https',   // PROXY_TYPE_HTTPS
      3: 'socks5',  // PROXY_TYPE_SOCKS5
      4: 'socks4',  // PROXY_TYPE_SOCKS4
      5: 'direct'   // PROXY_TYPE_NONE
    };

    // new database format
    pref.mode ||= 'disable';
    // rename disabled -> disable
    pref.mode === 'disabled' && (pref.mode = 'disable');
    // rename patterns -> pattern
    pref.mode === 'patterns' && (pref.mode = 'pattern');
    // convert old mode
    if (pref[pref.mode]) {
      const i = pref[pref.mode];
      pref.mode = `${i.address}:${i.port}`;
    }

    const db = App.getDefaultPref();
    db.sync = !!pref.sync;

    // null value causes an error in hasOwn, direct proxies don't have 'address'
    const data = Object.values(pref).filter(i => i && ['address', 'type'].some(p => Object.hasOwn(i, p)));

    // sort by index
    data.sort((a, b) => a.index - b.index);

    data.forEach(i => {
      // proxy template
      const pxy = {
        // convert to boolean, some old databases have mixed types
        active: i.active === 'true' || i.active === true,
        title: i.title || '',
        // convert to actual type: http | https | socks4 | socks5 | direct | + add PAC
        type: typeSet[i.type],
        // rename to hostname
        hostname: i.address || '',
        port: i.port || '',
        username: i.username || '',
        password: i.password || '',
        // remove country, use CC in location.js
        cc: i.cc || '',
        city: '',
        color: i.color || Color.getRandom(),
        // add PAC option
        pac: '',
        pacString: '',
        proxyDNS: !!i.proxyDNS,
        // rename to include
        include: i.whitePatterns || [],
        // rename to exclude
        exclude: i.blackPatterns || [],
        tabProxy: [],
      };

      // convert UK to ISO 3166-1 GB
      pxy.cc === 'UK' && (pxy.cc = 'GB');
      // type 'direct'
      pxy.type === 'direct' && (pxy.hostname = 'DIRECT');

/*
      {
        "active": true,
        "pattern": "*.example.com",
        "title": "example",
        "type": 1,
        // "protocols": 1,
      },
*/

      const patternSet = {
        1: 'wildcard',
        2: 'regex'
      };
      // process include/exclude
      [...pxy.include, ...pxy.exclude].forEach(i => {
        // convert to actual type: wildcard | regex
        i.type = patternSet[i.type];

        // convert wildcard all | http | https to v3 patterns
        i.pattern = i.type === 'wildcard' ?
          this.convertWildcard(i.pattern, i.protocols) : this.convertRegEx(i.pattern, i.protocols);
        // no longer needed
        delete i.protocols;

        // Validate RegExp, deactivate on error
        !Pattern.validate(i.pattern, i.type) && (i.active = false);

        // convert v6-7 patterns to match pattern (v9.0)
        if (i.type === 'wildcard' && Pattern.validMatchPattern(i.pattern + '*')) {
          i.type === 'match';
          i.pattern += '*';
        }
      });

      db.data.push(pxy);
    });

    return db;
  }

/*
  .bbc.co.uk      exact domain and all subdomains
  *.bbc.co.uk     exact domain and all subdomains
  **.bbc.co.uk    subdomains only (not bbc.co.uk)
*/
  static convertWildcard(pat, protocol) {
    const protocolSet = {
      // all | http | https
      1: '*://',
      2: 'http://',
      4: 'https://'
    };

    return protocolSet[protocol] + (pat.startsWith('.') ? '*' : '') + pat + '/';
  }

  static convertRegEx(pat, protocol) {
    const protocolSet = {
      // all | http | https
      1: '.+://',
      2: 'http://',
      4: 'https://'
    };

    // remove start assertion
    pat.startsWith('^') && (pat = pat.substring(1));
    // remove end assertion
    pat.endsWith('$') && (pat = pat.slice(0, -1));

    return protocolSet[protocol] + pat + '/';
  }
}