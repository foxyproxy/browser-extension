import {App} from './app.js';

export class Menus {

  static create(pref) {
    if (!browser.contextMenus) { return; }                  // not available on Android

    // https://source.chromium.org/chromium/chromium/src/+/main:chrome/common/extensions/api/context_menus.json
    // chrome.contextMenus not promise yet -> Uncaught TypeError: Cannot read properties of undefined (reading 'then')
    typeof browser.contextMenus.removeAll()?.then() === 'undefined' ?
      chrome.contextMenus.removeAll(() => this.addMenus(pref)) :
        browser.contextMenus.removeAll().then(() => this.addMenus(pref));
  }

  static addMenus(pref) {
    // --- create contextMenus
    const parentId = 'addHostTo';
    const contextMenus = [
      {id: parentId}
    ];

    // not for PAC, limit to 10
    pref.data.filter(i => i.type !== 'pac').forEach((item, index) => index < 10 &&
      contextMenus.push({
        parentId,
        id: `${item.hostname}:${item.port}`,
        title: App.getFlag(item.cc) + ' ' + item.title || `${item.hostname}:${item.port}`
      }));

    // create if there are proxies
    contextMenus[1] && contextMenus.forEach(item => {
      item.title = item.title || browser.i18n.getMessage(item.id); // always use the same ID for i18n
      item.documentUrlPatterns = ['<all_urls>'];            // limiting to supported schemes "http", "https", "file", "ftp", "app"
      item.contexts = ['all'];
      browser.contextMenus.create(item);
    });
  }
}
