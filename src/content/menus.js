// Using contextMenus namespace for compatibility with Chrome
// It's not possible to create tools menu items (contexts: ["tools_menu"]) using the contextMenus namespace.

import {App} from './app.js';
import {Proxy} from './proxy.js';
import {OnRequest} from './on-request.js';
import {Flag} from './flag.js';

// ---------- Context Menu ---------------------------------
export class Menus {

  static {
    // contextMenus is not supported on Android
    browser.contextMenus?.onClicked.addListener((...e) => this.process(...e));
    this.data = [];
  }

  static init(pref) {
    // not available on Android
    if (!browser.contextMenus) { return; }

    this.pref = pref;

    // https://source.chromium.org/chromium/chromium/src/+/main:chrome/common/extensions/api/context_menus.json
    // chrome.contextMenus not promise yet -> Uncaught TypeError: Cannot read properties of undefined (reading 'then')
    browser.contextMenus.removeAll(() => this.addMenus(pref.data));
  }

  static addMenus(data) {
    // not for PAC, limit to 10
    this.data = data.filter(i => i.active && i.type !== 'pac').slice(0, 10);
    if (!this.data[0]) { return; }

    // --- create contextMenus
    // https://searchfox.org/mozilla-central/source/browser/components/extensions/parent/ext-menus.js#756
    // https://searchfox.org/mozilla-central/source/browser/components/extensions/parent/ext-menus.js#625-636
    // contexts defaults to ['page'], 'all' is also added in Firefox but not in Chrome
    // https://github.com/w3c/webextensions/issues/774
    // Inconsistency: contextMenus/Menus
    // child menu inherits parent's contexts but chrome has a problem with inheriting in "action" contextMenus
    const {basic, firefox} = App;
    const allowedPattern = !basic && !this.pref.managed;
    const documentUrlPatterns = ['http://*/*', 'https://*/*'];
    // menus.create requires an id for non-persistent background scripts.
    this.contextMenus = [
      ...(allowedPattern ? [{id: 'includeHost', documentUrlPatterns}] : []),
      ...(allowedPattern ? [{id: 'excludeHost', documentUrlPatterns}] : []),
      ...(allowedPattern && firefox ? [{id: 'sep', type: 'separator', documentUrlPatterns}] : []),
      ...(firefox ? [{id: 'tabProxy'}] : []),
      ...(firefox ? [{parentId: 'tabProxy', id: 'tabProxy' + this.data.length, title: '\u00A0'}] : []),
      ...(firefox ? [{id: 'openLinkTabProxy', contexts: ['link']}] : []),
    ];

    allowedPattern && this.addProxies('includeHost');
    allowedPattern && this.addProxies('excludeHost');
    firefox && this.addProxies('tabProxy');
    firefox && this.addProxies('openLinkTabProxy');

    this.contextMenus.forEach(i => {
      // always use the same ID for i18n
      i.type !== 'separator' && (i.title ||= browser.i18n.getMessage(i.id));
      // add contexts
      // !i.parentId && (i.contexts ||= ['all']);
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
    const pref = this.pref;
    const id = info.parentMenuItemId;
    const index = info.menuItemId.substring(id.length);
    const proxy = this.data[index];
    switch (id) {
      case 'includeHost':
      case 'excludeHost':
        Proxy.includeHost(pref, proxy, tab, id);
        break;

      // --- firefox only
      case 'setTabProxy':
        OnRequest.setTabProxy(tab, proxy);
        break;

      case 'openLinkTabProxy':
        tab = await browser.tabs.create({});
        OnRequest.setTabProxy(tab, proxy);
        browser.tabs.update(tab.id, {url: info.linkUrl});
        break;
    }
  }
}