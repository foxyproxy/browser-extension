// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/commands/onCommand
// https://developer.chrome.com/docs/extensions/reference/commands/#event-onCommand
// Chrome commands returns command, tab
// https://bugzilla.mozilla.org/show_bug.cgi?id=1843866
// Add tab parameter to commands.onCommand (fixed in Firefox 126)

import {App} from './app.js';
import {Proxy} from './proxy.js';
import {OnRequest} from './on-request.js';

// ---------- Commands (Side Effect) ------------------------
class Commands {

  static {
    // commands is not supported on Android
    browser.commands?.onCommand.addListener((...e) => this.process(...e));
  }

  static async process(name, tab) {
    // firefox only Tab Proxy
    const tabProxy = ['setTabProxy', 'unsetTabProxy'].includes(name);
    if (!App.firefox && tabProxy) { return; }

    const pref = await browser.storage.local.get();

    // only Tab Proxy allowed for storage.managed
    if (pref.managed && !tabProxy) { return; }

    const host = pref.commands[name];
    let proxy;

    switch (name) {
      case 'proxyByPatterns':
        this.set(pref, 'pattern');
        break;

      case 'disable':
        this.set(pref, 'disable');
        break;

      case 'setProxy':
        host && this.set(pref, host);
        break;

      case 'includeHost':
      case 'excludeHost':
        if (!host) { break; }

        proxy = this.findProxy(pref, host);
        proxy && Proxy.includeHost(pref, proxy, tab, name);
        break;

      case 'setTabProxy':
        if (!host) { break; }

        proxy = this.findProxy(pref, host);
        proxy && OnRequest.setTabProxy(tab, proxy);
        break;

      case 'unsetTabProxy':
        OnRequest.setTabProxy(tab);
        break;
    }
  }

  static findProxy(pref, host) {
    return host && pref.data.find(i => i.active && host === `${i.hostname}:${i.port}`);
  }

  static set(pref, mode) {
    pref.mode = mode;
    // save mode
    browser.storage.local.set({mode});
    // set proxy without menus update
    Proxy.set(pref, true);
  }
}