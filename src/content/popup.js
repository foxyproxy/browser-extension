import {pref, App} from './app.js';
import {Location} from './location.js';
import './show.js';
import './i18n.js';

// ---------- User Preferences -----------------------------
await App.getPref();

// ---------- Popup ----------------------------------------
class Popup {

  static {
    // --- theme
    pref.theme && (document.documentElement.className = pref.theme);
    document.body.style.opacity = 1;                        // show after

    document.querySelectorAll('button').forEach(i => i.addEventListener('click', e => this.processButtons(e)));

    this.list = document.querySelector('div.list');

    // --- Quick Add (not for storage.managed)
    this.quickAdd = document.querySelector('select#quickAdd');
    !pref.managed && this.quickAdd.addEventListener('change', () => {
      if (!this.quickAdd.value) { return; }

      browser.runtime.sendMessage({id: 'quickAdd', pref, host: this.quickAdd.value, tab: this.tab});
      this.quickAdd.selectedIndex = 0;                      // reset select option
    });

    // --- Tab Proxy (firefox only)
    this.tabProxy = document.querySelector('select#tabProxy');
    App.firefox && this.tabProxy.addEventListener('change', () => {
      if (!this.tab) { return; }

      const proxy = this.tabProxy.value && this.proxyCache[this.tabProxy.selectedOptions[0].dataset.index];
      browser.runtime.sendMessage({id: 'setTabProxy', proxy, tab: this.tab});
    });

    // disable buttons on storage.managed
    pref.managed && document.body.classList.add('managed');

    // --- proxy filter
    const filter = document.querySelector('#filter');
    filter.value = '';                                      // reset after reload
    filter.addEventListener('input', e => this.filterProxy(e));

    // --- store details open toggle
    const details = document.querySelector('details');
    details.open = localStorage.getItem('more') !== 'false';    // defaults to true
    details.addEventListener('toggle', e => localStorage.setItem('more', details.open));

    this.process();
  }

  static process() {
    const labelTemplate = document.querySelector('template').content.firstElementChild;
    const docFrag = document.createDocumentFragment();

    // check if there are patterns
    if (!pref.data.some(i => i.active && i.include[0])) {
      this.list.children[0].style.display = 'none';         // hide option if there are no patterns
      pref.mode === 'pattern' && (pref.mode = 'disable');   // show as disable
    }

    pref.mode === 'pattern' && (this.list.children[0].children[2].checked = true);

    pref.data.filter(i => i.active).forEach(i => {
      const id = i.type === 'pac' ? i.pac : `${i.hostname}:${i.port}`;
      const label = labelTemplate.cloneNode(true);
      const [flag, title, port, radio, data] = label.children;
      flag.textContent = App.showFlag(i);
      title.textContent = i.title || i.hostname;
      port.textContent = i.port;
      radio.value = i.type === 'direct' ? 'direct' : id;
      radio.checked = id === pref.mode;
      data.textContent = [i.city, Location.get(i.cc)].filter(Boolean).join(', ') || ' ';
      docFrag.appendChild(label);
    });

    this.list.appendChild(docFrag);
    this.list.addEventListener('click', e =>
      // fires twice (click & label -> input)
      e.target.name === 'server' && this.processSelect(e.target.value)
    );

    // --- Add Hosts to select
    // used to find proxy, filter out PAC, limit to 10
    this.proxyCache = pref.data.filter(i => i.active && i.type !== 'pac').filter((i, idx) => idx < 10);

    this.proxyCache.forEach((i, index) => {
      const flag = App.showFlag(i);
      const value = `${i.hostname}:${i.port}`;
      const opt = new Option(flag + ' ' + (i.title || value), value);
      opt.dataset.index = index;
      // opt.style.color = item.color;                         // supported on Chrome, not on Firefox
      docFrag.appendChild(opt);
    });

    this.quickAdd.appendChild(docFrag.cloneNode(true));
    this.tabProxy.appendChild(docFrag);

    App.firefox && this.checkTabProxy();
  }

  static async checkTabProxy() {
    const [tab] = await browser.tabs.query({currentWindow: true, active: true});
    if (!App.allowedTabProxy(tab.url)) { return; }          // unacceptable URLs

    this.tab = tab;                                         // cache tab
    const item = await browser.runtime.sendMessage({id: 'getTabProxy', tab: this.tab});
    item && (this.tabProxy.value = `${item.hostname}:${item.port}`);
  }

  static processSelect(mode) {
    if (mode === pref.mode) { return; }                     // disregard re-click
    if (pref.managed) { return; }                           // not for storage.managed

    // check 'prefers-color-scheme' since it is not available in background service worker
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    pref.mode = mode;
    browser.storage.local.set({mode});                      // save mode
    browser.runtime.sendMessage({id: 'setProxy', pref, dark});
  }

  static processButtons(e) {
    switch (e.target.dataset.i18n) {
      case 'options':
        browser.runtime.openOptionsPage();
        window.close();
        break;

      case 'location':
        browser.tabs.create({url: 'https://getfoxyproxy.org/geoip/'});
        window.close();
        break;

      case 'ip':
        this.getIP();
        break;

      case 'log':
        browser.tabs.create({url: '/content/options.html?log'});
        window.close();
        break;

      case 'excludeHost':
        if (pref.managed) { break; }                        // not for storage.managed

        browser.runtime.sendMessage({id: 'excludeHost', pref, tab: this.tab});
        break;
    }
  }

  static filterProxy(e) {
    const str = e.target.value.toLowerCase().trim();
    if (!str) {
      [...this.list.children].forEach(i => i.classList.remove('off'));
      return;
    }

    [...this.list.children].forEach((item, idx) => {
      if (idx < 2) { return; }                              // not the first 2

      const title = item.children[1].textContent;
      const host = item.children[3].value;
      item.classList.toggle('off', ![title, host].some(i => i.toLowerCase().includes(str)));
    });
  }

  static getIP() {
    fetch('https://getfoxyproxy.org/webservices/lookup.php')
    .then(response => response.json())
    .then(data => {
      if (!Object.keys(data)) {
        App.notify(browser.i18n.getMessage('error'));
        return;
      }

      const [ip, {cc, city}] = Object.entries(data)[0];
      const text = [ip, , city, Location.get(cc)].filter(Boolean).join('\n');
      App.notify(text);
    })
    .catch(error => App.notify(browser.i18n.getMessage('error') + '\n\n' + error.message));
  }
}