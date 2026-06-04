import {App} from './app.js';

// ---------- browsingData (side effect) -------------------
class BrowsingData {

  static {
    document.querySelector('#deleteBrowsingData').addEventListener('click', () => this.process());
  }

  static async process() {
    // request permission
    // Chrome appears to return true, granted silently without a popup prompt
    const permission = await browser.permissions.request({permissions: ['browsingData']});
    if (!permission) { return; }

    if (!confirm(browser.i18n.getMessage('deleteBrowsingDataConfirm'))) { return; }

    browser.browsingData.remove({}, {
      cookies: true,
      indexedDB: true,
      localStorage: true
    })
   .catch(e => App.notify(`${browser.i18n.getMessage('deleteBrowsingData')}: ${e}`));
 }
}