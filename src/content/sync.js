import {App} from './app.js';

// ---------- Storage Sync ---------------------------------
export class Sync {

  static init(pref) {
    // not for storage.managed
    if (pref.managed) { return; }

    // Firefox 101 (2022-05-31), Chrome 73
    browser.storage.sync.onChanged.addListener(e => this.onChanged(e));
  }

  static async onChanged(changes) {
    const pref = await browser.storage.local.get();
    this.getSync(pref);
  }

  static async get(pref) {
    // check storage.managed
    await this.getManaged(pref);
    // check storage.sync
    await this.getSync(pref);
  }

  // https://bugzilla.mozilla.org/show_bug.cgi?id=1868153
  // On Firefox storage.managed returns undefined if not found
  static async getManaged(pref) {
    const result = await browser.storage.managed.get().catch(() => {});
    if (!Array.isArray(result?.data) || !result.data[0]) {
      // storage.managed not found, clean up
      if (Object.hasOwn(pref, 'managed')) {
        delete pref.managed;
        await browser.storage.local.remove('managed');
      }
      return;
    }

    // get default pref
    const db = App.getDefaultPref();
    // revert pref to default values
    Object.keys(db).forEach(i => pref[i] = db[i]);

    // set data from storage.managed
    Object.keys(result).forEach(i => Object.hasOwn(pref, i) && (pref[i] = result[i]));
    // set pref.managed to use in options.js, popup.js
    pref.managed = true;
    // no sync for storage.managed
    pref.sync = false;

    // --- update database
    await browser.storage.local.set(pref);
  }

  static hasOldData(obj) {
    // FP v3 OR FP v7, null value causes an error
    return Object.hasOwn(obj, 'settings') || Object.values(obj).some(i => i && Object.hasOwn(i, 'address'));
  }

  static async getSync(pref) {
    if (!pref.sync) { return; }
    if (pref.managed) { return; }

    const syncPref = await browser.storage.sync.get();

    // check sync from old version 3-7
    // (local has no data OR has old data) AND sync has old data
    if ((!Object.keys(pref)[0] || this.hasOldData(pref)) && this.hasOldData(syncPref)) {
      // set sync data to pref, to migrate next in background.js
      Object.keys(syncPref).forEach(i => pref[i] = syncPref[i]);
      return;
    }

    // convert object to array & filter proxies
    const data = Object.values(syncPref).filter(i => Object.hasOwn(i, 'hostname'));

    const obj = {};
    if (data[0] && !App.equal(pref.data, data)) {
      obj.data = data;
      pref.data = data;
    }

    App.syncProperties.forEach(i => {
      if (Object.hasOwn(syncPref, i)) {
        obj[i] = syncPref[i];
        pref[i] = syncPref[i];
      }
    });

    // update saved pref
    Object.keys(obj)[0] && await browser.storage.local.set(obj);
  }
}