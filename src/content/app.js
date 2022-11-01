// ----------------- Polyfill (Side Effect) ----------------
// Promise based 'browser' namespace is used to avoid conflict between
// callback 'chrome' API in MV2 & promise 'chrome' API in MV3
// In case of callback 'chrome' API in MV3, 'chrome' namespace is used
// Firefox & Edge: browser namespace
// Chrome & Opera: chrome namespace
typeof globalThis.browser === 'undefined' && (globalThis.browser = globalThis.chrome);
// MV3 action API
!browser.action && (browser.action = browser.browserAction);

// ----------------- Default Preference --------------------
export let pref = {
  mode: 'disable',
  sync: false,
  proxyDNS: true,
  globalExcludeWildcard: '',
  globalExcludeRegex: '',
  data: []
};
// ----------------- /Default Preference -------------------

// ----------------- App -----------------------------------
export class App {

  static firefox = navigator.userAgent.includes('Firefox'); // options 1 pac 6
  static chrome = navigator.userAgent.includes('Chrome');   // options 2 pac 4

  // ----------------- User Preference ---------------------
  static getPref() {
    // update pref with the saved version
    return browser.storage.local.get().then(result => {
      Object.keys(result).forEach(item => pref[item] = result[item]);
    });
  }

  // ----------------- Helper functions --------------------
  // https://bugs.chromium.org/p/chromium/issues/detail?id=478654
  // Add support for SVG images in Web Notifications API -> CH107
  static notify(message, title = browser.i18n.getMessage('extensionName'), id = '') {
    browser.notifications.create(id, {
      type: 'basic',
      iconUrl: '/image/icon.svg',
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

  static getTitle(item) {
    return item.title || (item.type === 'pac' ? item.pac : `${item.hostname}:${item.port}`);
  }
}

// ----------------- Import/Export Preferences -------------
export class ImportExport {

  static init(callback) {
    this.callback = callback;
    document.getElementById('file').addEventListener('change', (e) => this.import(e));
    document.getElementById('export').addEventListener('click', () => this.export());
  }

  static import(e) {
    const file = e.target.files[0];
    switch (true) {
      case !file: App.notify(browser.i18n.getMessage('error')); return;
      case !['text/plain', 'application/json'].includes(file.type): // check file MIME type
        App.notify(browser.i18n.getMessage('fileTypeError'));
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => this.readData(reader.result);
    reader.onerror = () => App.notify(browser.i18n.getMessage('fileReadError'));
    reader.readAsText(file);
  }

  static async readData(data) {
    try { data = JSON.parse(data); }
    catch(e) {
      App.notify(browser.i18n.getMessage('fileParseError')); // display the error
      return;
    }

    // update pref with the saved version
    Object.keys(pref).forEach(item => data.hasOwnProperty(item) && (pref[item] = data[item]));

    this.callback();                                        // successful import
  }

  static export() {
    const data = JSON.stringify(pref, null, 2);
    const filename = `${browser.i18n.getMessage('extensionName')}_${new Date().toISOString().substring(0, 10)}.json`;
    this.saveFile({data, filename, type: 'application/json'});
  }

  static saveFile({data, filename, saveAs = true, type = 'text/plain'}) {
    if (!browser.downloads) {
      const a = document.createElement('a');
      a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(data);
      a.setAttribute('download', filename);
      a.dispatchEvent(new MouseEvent('click'));
      return;
    }

    const blob = new Blob([data], {type});
    browser.downloads.download({
      url: URL.createObjectURL(blob),
      filename,
      saveAs,
      conflictAction: 'uniquify'
    });
  }
}
