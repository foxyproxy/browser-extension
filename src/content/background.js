import {App} from './app.js';
import {Migrate} from './migrate.js';
import {Authentication} from './authentication.js';
import {Proxy} from './proxy.js';

// ---------- Process Preference ---------------------------
class ProcessPref {

  static {
    browser.runtime.onMessage.addListener((...e) => this.onMessage(...e)); // from popup options
    this.showHelp = false;
    this.init();
  }

  static async init() {
    let pref = await browser.storage.local.get();

    // ---------- Sync Data --------------------------------
    if (pref.sync) {
      const syncPref = await browser.storage.sync.get();

      // convert object to array & filter proxies
      const data = Object.values(syncPref).filter(i => i.hasOwnProperty('hostname'));

      const obj = {};
      if (data[0] && !App.equal(pref.data, data)) {
        obj.data = data;
        pref.data = data;
      }

      ['proxyDNS', 'globalExcludeRegex', 'globalExcludeWildcard'].forEach(item => {
        if (syncPref.hasOwnProperty(item)) {
          obj[item] = syncPref[item];
          pref[item] = syncPref[item];
        }
      });

      Object.keys(obj)[0] && await browser.storage.local.set({obj}); // update saved pref
    }
    // ---------- /Sync Data -------------------------------

    // v8.0 migrate (after storage sync check)
    if (!pref.data) {
      pref = await Migrate.init(pref);
    }

    // add listener after migrate
    browser.storage.onChanged.addListener((...e) => this.onChanged(...e));

    // proxy authentication
    Authentication.init(pref.data);

    // set PAC in proxy.js
    Proxy.set(pref);

    // show help with additional info (after migrate & sync)
    if (this.showHelp) {
      browser.tabs.create({url: '/content/options.html?help'});
      this.showHelp = false;
    }
  }

  static onChanged(changes, area) {
    // no newValue on storage.local.clear()
    if (!Object.values(changes)[0]?.hasOwnProperty('newValue')) { return; }

    switch (true) {
      case area === 'sync':
        this.syncIn(changes);
        break;
    }
  }

  static async syncIn(changes) {
    const pref = await browser.storage.local.get('sync');
    if (!pref.sync) { return; }

    // convert object to array + filter null newValue (deleted) + map to newValue
    const data = Object.values(changes).filter(i => i.newValue?.hasOwnProperty('hostname')).map(i => i.newValue);

    const obj = {};
    data[0] && !App.equal(pref.data, data) && (obj.data = data);

    ['proxyDNS', 'globalExcludeRegex', 'globalExcludeWildcard'].forEach(item => {
      changes.hasOwnProperty(item) && (obj[item] = changes[item].newValue);
    });

    Object.keys(obj)[0] && browser.storage.local.set({obj}); // update local storage
  }

  static onMessage(message) {
    const {id, pref, host} = message;
    switch (id) {
      case 'setProxy':
        Authentication.init(pref.data);                     // update authentication data
        Proxy.set(pref);
        break;

      case 'quickAdd':
        this.quickAdd(pref, host);
        break;

      case 'excludeHost':
        this.excludeHost(pref);
        break;

      case 'setTabProxy':
        Proxy.setTabProxy(pref, host);
        break;

      case 'unsetTabProxy':
        Proxy.unsetTabProxy();
        break;
    }
  }

  static async quickAdd(pref, host) {
    const url = await this.getTabURL();
    if (!url) { return; }

    const pat = {
      active: true,
      pattern: `^${url.origin}/`,
      title: url.hostname,
      type: 'regex',
    };

    const pxy = pref.data.find(i => host === `${i.hostname}:${i.port}`);
    if (!pxy) { return; }

    pxy.include.push(pat);
    browser.storage.local.set({data: pref.data});
    pref.mode === 'pattern' && pxy.active && Proxy.set(pref); // update Proxy
  }

  static async excludeHost(pref) {
    const url = await this.getTabURL();
    if (!url) { return; }

    // add host pattern, remove duplicates
    const pat = `^${url.origin}/`;
    const exclude = pref.globalExcludeRegex.split(/\n+/);
    if (exclude.includes(pat)) { return; }

    exclude.push(pat);
    pref.globalExcludeRegex  = [...new Set(exclude)].join('\n').trim();
    browser.storage.local.set({globalExcludeRegex: pref.globalExcludeRegex});
    Proxy.set(pref);                                        // update Proxy
  }

  static async getTabURL() {
    const tab = await browser.tabs.query({currentWindow: true, active: true});
    const url = new URL(tab[0].url);
    if (!['http:', 'https:'].includes(url.protocol)) { return; } // acceptable URLs

    return url;
  }
}
// ---------- /Process Preference --------------------------

// ---------- Initialisation -------------------------------
browser.runtime.onInstalled.addListener(details => {
  ['install', 'update'].includes(details.reason) && (ProcessPref.showHelp = true);
});