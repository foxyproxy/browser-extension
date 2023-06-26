// ---------- Polyfill (Side Effect) -----------------------
// Promise based 'browser' namespace is used to avoid conflict between
// callback 'chrome' API in MV2 & promise 'chrome' API in MV3
// In case of callback 'chrome' API in MV3, 'chrome' namespace is used
// Firefox & Edge: browser namespace
// Chrome & Opera: chrome namespace
typeof globalThis.browser === 'undefined' && (globalThis.browser = globalThis.chrome);
// MV3 action API
!browser.action && (browser.action = browser.browserAction);

// ---------- Default Preference ---------------------------
export let pref = {
  mode: 'disable',
  sync: false,
  proxyDNS: true,
  globalExcludeWildcard: '',
  globalExcludeRegex: '',
  data: []
};
// ---------- /Default Preference --------------------------

// ---------- App ------------------------------------------
export class App {

  static firefox = navigator.userAgent.includes('Firefox');
  // static chrome = navigator.userAgent.includes('Chrome');

  // ---------- User Preference ----------------------------
  static getPref() {
    // update pref with the saved version
    return browser.storage.local.get().then(result => {
      Object.keys(result).forEach(item => pref[item] = result[item]);
    });
  }

  // ---------- Helper functions ---------------------------
  // https://bugs.chromium.org/p/chromium/issues/detail?id=478654
  // Add support for SVG images in Web Notifications API -> CH107
  // https://bugs.chromium.org/p/chromium/issues/detail?id=1353252
  // svg broken from bg service worker
  static notify(message, title = browser.i18n.getMessage('extensionName'), id = '') {
    browser.notifications.create(id, {
      type: 'basic',
      iconUrl: '/image/icon48.png',
      title,
      message
    });
  }

  static equal(a, b) {                                      // bg 2 options 1
    return JSON.stringify(a) === JSON.stringify(b);
  }

  static getFlag(cc) {
    cc = /^[A-Z]{2}$/i.test(cc) && cc.toUpperCase();
    return cc ? String.fromCodePoint(...[...cc].map(i => i.charCodeAt() + 127397)) : '🌎';
  }

  static parseURL(url) {
    try { url = new URL(url); }
    catch (error) {
      alert(`${url} ➜ ${error.message}`);
      return {};
    }

    // check protocol
    if (!['http:', 'https:'].includes(url.protocol)) {
      alert(`${url} ➜ Unsupported Protocol ${url.protocol}`);
      return {};
    }
    return url;
  }
}