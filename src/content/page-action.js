// page Action is not supported by Chrome in MV3
import {App} from './app.js';
import {Location} from './location.js';

// ---------- Firefox Page Action ------------------------
export class PageAction {

  static set(tabId, item) {
    const flag = App.getFlag(item.cc);
    const host = flag + ' ' + [item.hostname, item.port].filter(Boolean).join(':');
    const title = [host, item.city, ...Location.get(item.cc)].filter(Boolean).join('\n');
    browser.pageAction.setTitle({tabId, title});
    browser.pageAction.show(tabId);
  }

  static unset(tabId) {
    browser.pageAction.hide(tabId);
  }
}