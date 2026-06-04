import {pref, App} from './app.js';
import {Sync} from "./sync.js";
import {Migrate} from './migrate.js';
import {Proxy} from './proxy.js';
import './persist.js';

// ---------- process preferences --------------------------
class ProcessPref {

  static {
    this.init();
  }

  static async init() {
    // Chrome: Top-level await is disallowed in service workers
    // user preference
    await App.getPref();

    // storage sync -> local update
    await Sync.get(pref);

    // migrate after storage sync check
    await Migrate.init(pref);

    // set proxy, dataChange
    Proxy.set(pref, true);

    // add listener after migrate
    Sync.init(pref);
  }
}
// ---------- /process preferences -------------------------

// ---------- initialisation -------------------------------
// browser.runtime.onInstalled.addListener(e => {
//   // show help
//   ['install', 'update'].includes(e.reason) && browser.tabs.create({url: '/content/help.html'});
// });