import {App} from './app.js';

// ---------- Storage Sync ---------------------------------
export class Sync {

  static props = ['proxyDNS', 'passthrough'];

  static init() {
    browser.storage.sync.onChanged.addListener(e => this.onChanged(e));
  }

  static async onChanged(changes) {
    // no newValue on storage.local.clear()
    if (!Object.hasOwn(Object.values(changes)[0] || {}, 'newValue')) { return; }

    const pref = await browser.storage.local.get();
    if (!pref.sync) { return; }

    // convert object to array + filter null newValue (deleted) + map to newValue
    const data = Object.values(changes)
      .filter(i => Object.hasOwn(i.newValue || {}, 'hostname'))
      .map(i => i.newValue);

    const obj = {};
    data[0] && !App.equal(pref.data, data) && (obj.data = data);

    this.props.forEach(item => {
      Object.hasOwn(changes, item) && (obj[item] = changes[item].newValue);
    });

    Object.keys(obj)[0] && browser.storage.local.set(obj);  // update local storage
  }

  static async get(pref) {
    await this.getSync(pref);                               // check storage.sync
  }

  static hasOldData(obj) {
    // FP v3 OR FP v7
    return Object.hasOwn(obj, 'settings') || Object.hasOwn(obj, 'foxyProxyEdition');
  }

  static async getSync(pref) {
    if (!pref.sync) { return; }

    const syncPref = await browser.storage.sync.get();

    // check sync from old version 3-7
    if ((!Object.keys(pref)[0] || this.hasOldData(pref)) && this.hasOldData(syncPref)) { // (local has no data OR has old data) AND sync has old data
      Object.keys(syncPref).forEach(i => pref[i] = syncPref[i]); // set sync data to pref to migrate next in background.js
      return;
    }

    // convert object to array & filter proxies
    const data = Object.values(syncPref).filter(i => Object.hasOwn(i, 'hostname'));

    const obj = {};
    if (data[0] && !App.equal(pref.data, data)) {
      obj.data = data;
      pref.data = data;
    }

    this.props.forEach(item => {
      if (Object.hasOwn(syncPref, item)) {
        obj[item] = syncPref[item];
        pref[item] = syncPref[item];
      }
    });

    Object.keys(obj)[0] && await browser.storage.local.set({obj}); // update saved pref
  }
}