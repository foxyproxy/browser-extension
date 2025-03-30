import {pref, App} from './app.js';
import {Location} from './location.js';
import {Flag} from './flag.js';
import './popup-filter.js';
import './show.js';
import './i18n.js';

// ---------- User Preferences -----------------------------
await App.getPref();

// ---------- Popup ----------------------------------------
class Popup {

  static {
    // --- theme
    pref.theme && (document.documentElement.className = pref.theme);
    // show after
    document.body.style.opacity = 1;

    document.querySelectorAll('button').forEach(i => i.addEventListener('click', e => this.processButtons(e)));

    this.list = document.querySelector('div.list');

    // --- Include/Exclude Host (not for storage.managed)
    this.includeHost = document.querySelector('select#includeHost');
    !pref.managed && this.includeHost.addEventListener('change', e => this.includeExclude(e));
    this.excludeHost = document.querySelector('select#excludeHost');
    !pref.managed && this.excludeHost.addEventListener('change', e => this.includeExclude(e));

    // --- Tab Proxy (firefox only)
    this.tabProxy = document.querySelector('select#tabProxy');
    App.firefox && this.tabProxy.addEventListener('change', e => {
      if (!this.tab) { return; }

      const {value, selectedOptions} = e.target;
      const proxy = value && this.proxyCache[selectedOptions[0].dataset.index];
      browser.runtime.sendMessage({id: 'setTabProxy', proxy, tab: this.tab});
    });

    // disable buttons on storage.managed
    pref.managed && document.body.classList.add('managed');

    // --- store details open toggle
    const details = document.querySelector('details');
    // defaults to true
    details.open = localStorage.getItem('more') !== 'false';
    details.addEventListener('toggle', () => localStorage.setItem('more', details.open));

    this.process();
  }

  static includeExclude(e) {
    const {id, value} = e.target;
    if (!value) { return; }
    // proxy object reference to pref is lost in chrome when sent from popup.js
    browser.runtime.sendMessage({id, pref, host: value, tab: this.tab});
    // reset select option
    e.target.selectedIndex = 0;
  }

  static checkProxyByPatterns() {
    // check if there are patterns
    if (!pref.data.some(i => i.active && (i.include[0] || i.tabProxy?.[0]))) {
      // hide option if there are no patterns
      this.list.children[0].style.display = 'none';
      // show as disable
      pref.mode === 'pattern' && (pref.mode = 'disable');
    }

    pref.mode === 'pattern' && (this.list.children[0].children[2].checked = true);
  }

  static async process() {
    this.checkProxyByPatterns();

    const labelTemplate = document.querySelector('template').content.firstElementChild;
    const docFrag = document.createDocumentFragment();

    pref.data.filter(i => i.active).forEach(i => {
      const id = i.type === 'pac' ? i.pac : `${i.hostname}:${i.port}`;
      const label = labelTemplate.cloneNode(true);
      const [flag, title, port, radio, data] = label.children;
      flag.textContent = Flag.show(i);
      title.textContent = i.title || i.hostname;
      port.textContent = !i.title ? i.port : '';
      radio.value = i.type === 'direct' ? 'direct' : id;
      radio.checked = id === pref.mode;
      data.textContent = [i.city, Location.get(i.cc)].filter(Boolean).join(', ') || ' ';
      docFrag.append(label);
    });

    this.list.append(docFrag);
    this.list.addEventListener('click', e =>
      // fires twice (click & label -> input)
      e.target.name === 'server' && this.processSelect(e.target.value, e)
    );

    // --- Add Hosts to select
    // used to find proxy, filter out PAC, limit to 10
    this.proxyCache = pref.data.filter(i => i.active && i.type !== 'pac').slice(0, 10);

    this.proxyCache.forEach((i, index) => {
      const flag = Flag.show(i);
      const value = `${i.hostname}:${i.port}`;
      const opt = new Option(flag + ' ' + (i.title || value), value);
      opt.dataset.index = index;
      // supported on Chrome, not on Firefox
      // opt.style.color = item.color;
      docFrag.append(opt);
    });

    this.includeHost.append(docFrag.cloneNode(true));
    this.excludeHost.append(docFrag.cloneNode(true));
    this.tabProxy.append(docFrag);

    // get active tab
    [this.tab] = await browser.tabs.query({currentWindow: true, active: true});

    // --- show/hide selects
    document.body.classList.toggle('not-http', !this.tab.url.startsWith('http'));

    // Check Tab proxy (Firefox only)
    const allowedTabProxy = App.firefox && App.allowedTabProxy(this.tab.url);
    allowedTabProxy && this.checkTabProxy();
    document.body.classList.toggle('not-tab-proxy', !allowedTabProxy);
  }

  static checkTabProxy() {
    browser.runtime.sendMessage({id: 'getTabProxy', tab: this.tab})
    .then(i => i && (this.tabProxy.value = `${i.hostname}:${i.port}`));
  }

  static processSelect(mode, e) {
    // disregard re-click
    if (mode === pref.mode) { return; }
    // not for storage.managed
    if (pref.managed) { return; }

    // check 'prefers-color-scheme' since it is not available in background service worker
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // save mode
    pref.mode = mode;
    browser.storage.local.set({mode});
    browser.runtime.sendMessage({id: 'setProxy', pref, dark, noDataChange: true});
  }

  static processButtons(e) {
    switch (e.target.dataset.i18n) {
      case 'options':
        browser.runtime.openOptionsPage();
        break;

      case 'location':
        browser.tabs.create({url: 'https://getfoxyproxy.org/geoip/'});
        break;

      case 'ip':
        // sending message to the background script to complete even if popup gets closed
        browser.runtime.sendMessage({id: 'getIP'});
        break;

      case 'log':
        browser.tabs.create({url: '/content/options.html?log'});
        break;
    }

    window.close();
  }
}