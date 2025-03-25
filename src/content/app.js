// ---------- Polyfill (Side Effect) -----------------------
// Promise based 'browser' namespace is used to avoid conflict
// Firefox 'chrome' API: MV2 callback | MV3 promise
// Firefox/Edge: browser namespace | Chrome/Opera: chrome namespace
globalThis.browser ??= chrome;

// ---------- Default Preferences --------------------------
export const pref = {
  mode: 'disable',
  sync: false,
  autoBackup: false,
  passthrough: '',
  theme: '',
  container: {},
  commands: {},
  data: []
};
// ---------- /Default Preferences -------------------------

// ---------- App ------------------------------------------
export class App {

  // https://github.com/foxyproxy/firefox-extension/issues/220
  // navigator.userAgent identification fails in custom userAgent and browser forks
  // Chrome does not support runtime.getBrowserInfo()
  // getURL: moz-extension: | chrome-extension: | safari-web-extension:
  static firefox = browser.runtime.getURL('').startsWith('moz-extension:');
  static basic = browser.runtime.getManifest().name === browser.i18n.getMessage('extensionNameBasic');
  static android = navigator.userAgent.includes('Android');

  // ---------- User Preferences ---------------------------
  // not syncing mode & sync (to have a choice), data (will be broken into parts)
  static syncProperties = Object.keys(pref).filter(i => !['mode', 'sync', 'data'].includes(i));

  static defaultPref = JSON.stringify(pref);

  static getDefaultPref() {
    return JSON.parse(this.defaultPref);
  }

  static getPref() {
    // update pref with the saved version
    return browser.storage.local.get().then(result => {
      Object.keys(result).forEach(i => pref[i] = result[i]);
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

  static equal(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  static parseURL(url) {
    // rebuild file://
    url.startsWith('file://') && (url = 'http' + url.substring(4));

    try { url = new URL(url); }
    catch (error) {
      alert(`${url} ➜ ${error.message}`);
      return {};
    }

    // check protocol
    if (!['http:', 'https:', 'file:'].includes(url.protocol)) {
      alert(`${url} ➜ Unsupported Protocol ${url.protocol}`);
      return {};
    }

    return url;
  }

  static allowedTabProxy(url) {
    return /^https?:\/\/.+|^about:(blank|newtab)$/.test(url);
  }
}