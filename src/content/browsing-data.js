import {App} from './app.js';

// ---------- browsingData (Side Effect) -------------------
class BrowsingData {

  static {
    document.querySelector('#deleteBrowsingData').addEventListener('click', () => this.process());
    this.init();
  }

  static async init() {
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/permissions/request
    // Any permissions granted are retained by the extension, even over upgrade and disable/enable cycling.
    // check if permission is granted
    this.permission = await browser.permissions.contains({permissions: ['browsingData']});
  }

  static async process() {
    if (!this.permission) {
      // request permission
      // Chrome appears to return true, granted silently without a popup prompt
      this.permission = await browser.permissions.request({permissions: ['browsingData']});
      if (!this.permission) { return; }
    }

    if (!confirm(browser.i18n.getMessage('deleteBrowsingDataConfirm'))) { return; }

    browser.browsingData.remove({}, {
      cookies: true,
      indexedDB: true,
      localStorage: true
    })
   .catch(error => App.notify(browser.i18n.getMessage('deleteBrowsingData') + '\n\n' + error.message));
 }
}