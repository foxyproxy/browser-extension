import {pref, App} from './app.js';
import {Location} from './location.js';
import './i18n.js';

// ---------- User Preference ------------------------------
await App.getPref();

// ---------- Popup ----------------------------------------
class Popup {

  static {
    document.querySelectorAll('button').forEach(i => i.addEventListener('click', e => this.processButtons(e)));
    this.process();
  }

  static process() {
    const list = document.querySelector('div.list');
    const labelTemplate = document.querySelector('template').content.firstElementChild;
    const docFrag = document.createDocumentFragment();

    // check if there are patterns
    if (!pref.data.some(i => i.include[0])) {
      list.children[0].style.display = 'none';              // hide option if there are no patterns
      pref.mode === 'pattern' && (pref.mode = 'disable');   // show as disable
    }

    pref.mode === 'pattern' && (list.children[0].children[2].checked = true);

    pref.data.filter(i => i.active).forEach(item => {
      const id = item.type === 'pac' ? item.pac : `${item.hostname}:${item.port}`;
      const label = labelTemplate.cloneNode(true);
      const [flag, title, portNo, radio, data] = label.children;
      flag.textContent = App.getFlag(item.cc);
      title.textContent = item.title || id;
      portNo.textContent = item.port;
      radio.value = id;
      radio.checked = id === pref.mode;
      data.textContent = [item.city, ...Location.get(item.cc)].filter(Boolean).join('\n');
      docFrag.appendChild(label);
    });

    list.appendChild(docFrag);
    list.addEventListener('click', e =>
      // fires twice (click & label -> input)
      e.target.name === 'server' && this.processSelect(e.target.value)
    );

    // --- Add Hosts to select
    const select = document.querySelector('select');
    select.addEventListener('change', this.addHost);

    // filter out PAC, limit to 10
    pref.data.filter(i => i.active && i.type !== 'pac').filter((i, idx) => idx < 10).forEach(item => {
      const flag = App.getFlag(item.cc);
      const value = `${item.hostname}:${item.port}`;
      const opt = new Option(flag + ' ' + (item.title || value), value);
      opt.style.color = item.color;                         // supported on Chrome, not on Firefox
      docFrag.appendChild(opt);
    });

    select.appendChild(docFrag);
  }

  static processSelect(mode) {
    if (mode === pref.mode) { return; }                     // disregard re-click

    pref.mode = mode;
    browser.storage.local.set({mode});                      // save mode
    browser.runtime.sendMessage({id: 'setProxy', pref});
    localStorage.setItem('mode', mode);                     // keep a copy for options page ???
  }

  static addHost() {
    browser.runtime.sendMessage({id: 'addHost', pref, host: this.value});
    this.selectedIndex = 0;                                 // reset select option
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

      case 'excludeHost':
        browser.runtime.sendMessage({id: 'excludeHost', pref});
        break;
    }
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
      const text = [ip, , city, ...Location.get(cc)].filter(Boolean).join('\n');
      App.notify(text);
    })
    .catch(error => App.notify(browser.i18n.getMessage('error') + '\n\n' + error.message));
  }
}
// ---------- /Popup ---------------------------------------