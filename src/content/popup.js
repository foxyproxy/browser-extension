import {pref, App} from './app.js';
import {Location} from './location.js';
import './i18n.js';

// ----------------- Popup ---------------------------------
class Popup {

  constructor() {
    document.querySelectorAll('button').forEach(item => item.addEventListener('click', this.processButtons));
    this.select = document.querySelector('select');
    this.select.addEventListener('change', () => this.setMode());
    this.display = document.querySelector('.display');
    this.process();
  }

  processButtons() {
    switch (this.dataset.i18n) {
      case 'options':
        browser.runtime.openOptionsPage();
        window.close();
        break;

      case 'ip':
        browser.runtime.sendMessage({id: 'ip'});
        break;

      case 'location':
        browser.tabs.create({url: 'https://getfoxyproxy.org/geoip/'});
        window.close();
        break;
    }
  }

  process() {
    // check if there are patterns
    if (!pref.data.some(item => item.include[0] || item.exclude[0])) {
      this.select.options[1].style.display = 'none';        // hide option if there are no patterns
      pref.mode === 'pattern' && (pref.mode = 'disable');   // show as disable
    }

    this.setDisplay();

    // add proxies to select
    const docFrag = document.createDocumentFragment();
    pref.data.forEach((item, index) => {
      if (!item.active) { return; }                         // filter out inactive

      const flag = App.getFlag(item.cc);
      const value = item.type === 'pac' ? item.pac : `${item.hostname}:${item.port}`;
      const opt = new Option(flag + ' ' + (item.title || value), value);
      opt.id = index;
      opt.style.color = item.color;                         // supported on Chrome, not on Firefox
      docFrag.appendChild(opt);
    });
    this.select.appendChild(docFrag);
  }

  setDisplay(proxy) {console.log(pref.mode);
    this.select.selectedIndex = 0;                          // reset select option
    const [flag, title, location] = this.display.children;
    switch (pref.mode) {
      case 'pattern':
        flag.classList.remove('off');
        flag.classList.add('on');
        flag.textContent = '';
        title.textContent = browser.i18n.getMessage('proxyByPatterns');
        location.textContent = '';
        break;

      case 'disable':
        flag.classList.remove('on');
        flag.classList.add('off');
        flag.textContent = '';
        title.textContent = browser.i18n.getMessage('disable');
        location.textContent = '';
        break;

      default:
        const pac = pref.mode.includes('://');
        proxy = proxy || pref.data.find(item => pref.mode === (pac ? item.pac : `${item.hostname}:${item.port}`));
        if (!proxy) {
          // set to disable
          this.select.value = 'disable';
          this.setMode();
          return;
        }

        flag.classList.remove('on', 'off');
        flag.textContent = App.getFlag(proxy.cc);
        title.textContent =  App.getTitle(proxy);
        location.textContent = Location.get(proxy);
    }
  }

  setMode() {
    // mode can only be change in the popup
    const mode = this.select.value;
    if (mode === pref.mode) { return; }                     // no change

    pref.mode = mode;
    browser.storage.local.set({mode});
    localStorage.setItem('mode', mode);                     // keep a copy for options page

    const id = this.select.options[this.select.selectedIndex].id;
    const proxy = id && pref.data[id];                      // id is only set for proxies
    this.setDisplay(proxy);                                 // update display

    browser.runtime.sendMessage({id: 'setPAC', pref, proxy});
  }
}
// ----------------- /Popup --------------------------------

// ----------------- User Preference -----------------------
App.getPref().then(() => new Popup());
