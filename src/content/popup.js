import {pref, App} from './app.js';
import {Location} from './location.js';
import './i18n.js';

// ----------------- Popup ---------------------------------
class Popup {

  constructor() {
    document.querySelectorAll('button').forEach(item => item.addEventListener('click', e => this.processButtons(e)));

    this.ul = document.querySelector('ul');
    this.ul.addEventListener('click', e => this.processSelect(e));
    this.liTemplate = document.querySelector('template').content.firstElementChild;

    this.select = document.querySelector('select');
    this.select.addEventListener('change', () => this.addHost());

    document.querySelector('div.excludeHost').addEventListener('click', () => this.excludeHost());

    this.process();
  }

  process() {
    // check if there are patterns
    if (!pref.data.some(item => item.include[0] || item.exclude[0])) {
      this.ul.children[0].style.display = 'none';           // hide option if there are no patterns
      pref.mode === 'pattern' && (pref.mode = 'disable');   // show as disable
    }

    // --- show proxies
    [...this.ul.children].forEach((item, index) => index > 1 && item.remove()); // reset ul
    this.ul.children[pref.mode === 'pattern' ? 0 : 1].children[2].checked = true; // pre-select pattern/disable

    const docFrag = document.createDocumentFragment();
    const data = pref.data.filter(i => i.active);           // filter out inactive
    data.forEach(item => {
       const li = this.liTemplate.cloneNode(true);
      li.id = item.type === 'pac' ? item.pac : `${item.hostname}:${item.port}`;

      const [flag, title, radio, data] = li.children;
      flag.textContent = App.getFlag(item.cc);
      title.textContent = item.title || li.id;
      radio.checked = pref.mode === li.id;
      data.textContent = item.city;
      docFrag.appendChild(li);
    });

    this.ul.appendChild(docFrag);

    // --- Add Hosts to select
    // filter out PAC, limit to 10
    data.filter(i => i.type !== 'pac').forEach((item, index) => {
      if (index > 10) { return; }

      const flag = App.getFlag(item.cc);
      const value = `${item.hostname}:${item.port}`;
      const opt = new Option(flag + ' ' + (item.title || value), value);
      opt.style.color = item.color;                         // supported on Chrome, not on Firefox
      docFrag.appendChild(opt);
    });

    this.select.appendChild(docFrag);
  }

  processSelect(e) {
    const li = e.target.closest('li');
    if(!li) { return; }

    li.children[2].checked = true;

    // mode can only be change in the popup
    const mode = li.id;
    if (mode === pref.mode) { return; }                     // no change

    pref.mode = mode;
    browser.storage.local.set({mode});
    localStorage.setItem('mode', mode);                     // keep a copy for options page
    browser.runtime.sendMessage({id: 'setProxy', pref});
  }

  addHost() {
    const host = this.select.value;
    browser.runtime.sendMessage({id: 'addHost', pref, host});
    this.select.selectedIndex = 0;                          // reset select option
  }

  excludeHost() {
    browser.runtime.sendMessage({id: 'excludeHost', pref});
  }

  processButtons(e) {
    switch (e.target.dataset.i18n) {
      case 'options':
        browser.runtime.openOptionsPage();
        break;

      case 'location':
        browser.tabs.create({url: 'https://getfoxyproxy.org/geoip/'});
        break;

      case 'ip':
        this.getIP();
        break;
    }
  }

  getIP() {
    // Network Request Timeout: Chrome 300 sec, Firefox 90 sec
    fetch('https://getfoxyproxy.org/webservices/lookup.php')
    .then(response => response.json())
    .then(data => {
      if (!Object.keys(data)) {
        App.notify(browser.i18n.getMessage('error'));
        return;
      }

      const [ip, {cc, city}] = Object.entries(data)[0];
      const text = [ip, Location.get({cc, city})].filter(Boolean).join('\n\n');
      App.notify(text);
    })
    .catch(error => App.notify(browser.i18n.getMessage('error') + '\n\n' + error.message));
  }
}
// ----------------- /Popup --------------------------------

// ----------------- User Preference -----------------------
App.getPref().then(() => new Popup());
