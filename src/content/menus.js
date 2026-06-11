// using contextMenus namespace for compatibility with Chrome
// It's not possible to create tools menu items (contexts: ["tools_menu"]) using the contextMenus namespace.

import {App} from './app.js';
import {Flag} from './flag.js';

// ---------- context menu ---------------------------------
export class Menus {

  static data = [];
  // cant runtime.sendMessage to the same context
  // callback is set in proxy.js
  static callback = () => {};

  static {
    // contextMenus is not supported on Android
    browser.contextMenus?.onClicked.addListener((...e) => this.process(...e));
  }

  // init from proxy.js
  static async init(pref) {
    // not supported on Android
    if (!browser.contextMenus) { return; }

    // not for PAC, limit to 100
    this.data = pref.data.filter(i => i.active && i.type !== 'pac').slice(0, 100);

    // https://source.chromium.org/chromium/chromium/src/+/main:chrome/common/extensions/api/context_menus.json
    // chrome.contextMenus not promise yet -> Uncaught TypeError: Cannot read properties of undefined (reading 'then')
    browser.contextMenus.removeAll(() => this.data[0] && this.addMenus(pref));

    // await browser.contextMenus.removeAll();
    // this.data[0] && this.addMenus(pref);
  }

  static addMenus(pref) {
    // https://searchfox.org/mozilla-central/source/browser/components/extensions/parent/ext-menus.js#756
    // https://searchfox.org/mozilla-central/source/browser/components/extensions/parent/ext-menus.js#625-636
    // contexts defaults to ['page'], 'all' is also added in Firefox but not in Chrome
    // https://github.com/w3c/webextensions/issues/774
    // Inconsistency: contextMenus/Menus
    // child menu inherits parent's contexts but chrome has a problem with inheriting in "action" contextMenus
    const {basic, firefox} = App;
    const allowedPattern = !basic && !pref.managed;
    const documentUrlPatterns = ['http://*/*', 'https://*/*'];
    // menus.create requires an id for non-persistent background scripts.
    this.contextMenus = [
      ...(allowedPattern ? [{id: 'includeHost', documentUrlPatterns}] : []),
      ...(allowedPattern ? [{id: 'excludeHost', documentUrlPatterns}] : []),
      ...(allowedPattern && firefox ? [{id: 'sep', type: 'separator', documentUrlPatterns}] : []),
      ...(firefox ? [{id: 'tabProxy'}] : []),
      ...(firefox ? [{parentId: 'tabProxy', id: 'tabProxy' + this.data.length, title: '\u00A0'}] : []),
      ...(firefox ? [{id: 'containerProxy'}] : []),
      ...(firefox ? [{parentId: 'containerProxy', id: 'containerProxy' + this.data.length, title: '\u00A0'}] : []),
      ...(firefox ? [{id: 'openLinkTabProxy', contexts: ['link']}] : []),
    ];

    allowedPattern && this.addProxies('includeHost');
    allowedPattern && this.addProxies('excludeHost');
    firefox && this.addProxies('tabProxy');
    firefox && this.addProxies('containerProxy');
    firefox && this.addProxies('openLinkTabProxy');

    this.contextMenus.forEach(i => {
      // always use the same ID for i18n
      i.type !== 'separator' && (i.title ||= browser.i18n.getMessage(i.id));
      i.contexts ||= ['all'];
      browser.contextMenus.create(i);
    });
  }

  static addProxies(parentId) {
    this.data.forEach((i, index) =>
      this.contextMenus.push({
        parentId,
        id: parentId + index,
        title: Flag.get(i.cc) + ' ' + (i.title || `${i.hostname}:${i.port}`)
      })
    );
  }

  static async process(info, tab) {
    const pref = await browser.storage.local.get();
    const id = info.parentMenuItemId;
    const idx = info.menuItemId.substring(id.length);
    const proxy = this.data[idx];
    const value = proxy ? `${proxy.hostname}:${proxy.port}` : '';
    switch (id) {
      case 'includeHost':
      case 'excludeHost':
        // proxy object reference to pref is lost in chrome in sendMessage
        this.callback({update: id, pref, host: value, tab});
        break;

      // --- firefox only
      case 'tabProxy':
        this.callback({update: 'setTabProxy', proxy, tab});
        break;

      // --- firefox only
      case 'containerProxy':
        const c = tab.cookieStoreId.substring(8);
        value ? pref.container[c] = value : delete pref.container[c];
        this.callback({update: 'setContainerProxy', pref});
        break;

      case 'openLinkTabProxy':
        tab = await browser.tabs.create({});
        await this.callback({update: 'setTabProxy', proxy, tab});
        browser.tabs.update(tab.id, {url: info.linkUrl});
        break;
    }
  }
}