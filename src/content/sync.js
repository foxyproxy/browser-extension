import {App} from './app.js';

// ---------- Storage Sync ---------------------------------
export class Sync {

  static init() {
    this.props = ['proxyDNS', 'passthrough'];
    browser.storage.sync.onChanged.addListener(e => this.onChanged(e));
  }

  static async onChanged(changes) {
    // no newValue on storage.local.clear()
    if (!Object.values(changes)[0]?.hasOwnProperty('newValue')) { return; }

    const pref = await browser.storage.local.get();
    if (!pref.sync) { return; }

    // convert object to array + filter null newValue (deleted) + map to newValue
    const data = Object.values(changes)
      .filter(i => i.newValue?.hasOwnProperty('hostname') || i.newValue?.hasOwnProperty('pac'))
      .map(i => i.newValue);

    const obj = {};
    data[0] && !App.equal(pref.data, data) && (obj.data = data);

    this.props.forEach(item => {
      changes.hasOwnProperty(item) && (obj[item] = changes[item].newValue);
    });

    Object.keys(obj)[0] && browser.storage.local.set({obj}); // update local storage
  }

  static async get(pref) {
    if (!pref.sync) { return; }

    const syncPref = await browser.storage.sync.get();

    // convert object to array & filter proxies
    const data = Object.values(syncPref).filter(i => i.hasOwnProperty('hostname'));

    const obj = {};
    if (data[0] && !App.equal(pref.data, data)) {
      obj.data = data;
      pref.data = data;
    }

    this.props.forEach(item => {
      if (syncPref.hasOwnProperty(item)) {
        obj[item] = syncPref[item];
        pref[item] = syncPref[item];
      }
    });

    Object.keys(obj)[0] && await browser.storage.local.set({obj}); // update saved pref
  }
}