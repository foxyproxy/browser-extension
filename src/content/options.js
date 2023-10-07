import {pref, App} from './app.js';
import {ProgressBar} from './progress-bar.js';
import {ImportExport} from './import-export.js';
import {Pattern} from './pattern.js';
import {Migrate} from './migrate.js';
import {Color} from './color.js';
import {Nav} from './nav.js';
import {Spinner} from './spinner.js';
import {Log} from './log.js';
import './i18n.js';

// ---------- User Preference ------------------------------
await App.getPref();

// ---------- Incognito Access -----------------------------
class IncognitoAccess{

  static {
    // https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/proxy/settings
    // Changing proxy settings requires private browsing window access because proxy settings affect private and non-private windows.
    // https://github.com/w3c/webextensions/issues/429
    // Inconsistency: incognito in proxy.settings
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1725981
    // proxy.settings is not supported on Android
    App.firefox && browser.proxy.settings && browser.extension.isAllowedIncognitoAccess()
    .then(response => !response && alert(browser.i18n.getMessage('incognitoAccessError')));
  }
}
// ---------- /Incognito Access ----------------------------

// ---------- Toggle ---------------------------------------
class Toggle {

  static password() {
    this.previousElementSibling.type = this.previousElementSibling.type === 'password' ? 'text' : 'password';
  }
}
// ---------- /Toggle --------------------------------------

// ---------- Options --------------------------------------
class Options {

  static {
    this.sync = document.getElementById('sync');
    this.proxyDNS = document.getElementById('proxyDNS');

    // --- container
    this.container = document.querySelectorAll('.options .container select');

    // --- keyboard Shortcut
    this.commands = document.querySelectorAll('.options .commands select');

    // --- global exclude
    this.globalExcludeWildcard = document.getElementById('globalExcludeWildcard');
    this.globalExcludeRegex = document.getElementById('globalExcludeRegex');
    const select = document.querySelector('.options .globalExclude select');
    select.selectedIndex = 0;
    select.addEventListener('change', () => {
      const target = select.options[select.selectedIndex].dataset.type === 'regex' ? this.globalExcludeRegex : this.globalExcludeWildcard;
      target.value = (target.value.trim() + '\n' + select.value).trim();
      select.selectedIndex = 0;
    });

    // --- buttons
    document.querySelector('.options button[data-i18n="restoreDefaults"]').addEventListener('click', () => this.restoreDefaults());

    this.init(['sync', 'proxyDNS', 'globalExcludeWildcard', 'globalExcludeRegex']);
  }

  static init(keys = Object.keys(pref)) {
    this.prefNode = document.querySelectorAll('#' + keys.join(',#')); // defaults to pref keys
    document.querySelectorAll('button[type="submit"]').forEach(i => i.addEventListener('click', () => this.check())); // submit button

    this.process();
  }

  static process(save) {
    // 'save' is only set when clicking the button to save options
    this.prefNode.forEach(node => {
      // value: 'select-one', 'textarea', 'text', 'number'
      const attr = node.type === 'checkbox' ? 'checked' : 'value';
      save ? pref[node.id] = node[attr] : node[attr] = pref[node.id];
    });

    save && !ProgressBar.show() && browser.storage.local.set(pref); // update saved pref
    this.fillContainerCommands();
  }

  static async check() {
    // --- global exclude
    if (!this.checkGlobalExclude(this.globalExcludeWildcard)) { return; };
    if (!this.checkGlobalExclude(this.globalExcludeRegex)) { return; };
    const globalExcludeChanged = pref.globalExcludeWildcard !== this.globalExcludeWildcard.value ||
      pref.globalExcludeRegex !== this.globalExcludeRegex.value;

    // --- check and build proxies & patterns
    const ids = [];
    const data = [];
    const cache = {};
    // using for loop to be able to break early
    for (const item of document.querySelectorAll('div.proxyDiv details')) {
      const pxy = this.getProxyDetails(item);
      if (!pxy) { return; }

      data.push(pxy);

      // cache to update Proxies cache
      const id = pxy.type === 'pac' ? pxy.pac : `${pxy.hostname}:${pxy.port}`;
      cache[id] = pxy;
    }
    const dataChanged = !App.equal(pref.data, data);        // check if proxies & patterns have changed

    // no errors, update pref.data
    pref.data = data;

    // update Log proxyCache
    Log.proxyCache = Cache;                                 // used to get the denials for the log

    // helper: remove if proxy is deleted or disabled
    const checkSelect = i => i.value && !cache[i.value]?.active && (i.value = '');

    // --- container proxy
    const container = {};
    this.container.forEach(i => {
      checkSelect(i);
      container[i.name] = i.value;
    });
    const containerChanged = Object.keys(container).some(i => container[i] !== pref.container[i]);
    pref.container = container;                             // set to pref

    // --- keyboard shortcut proxy
    const commands = {};
    this.commands.forEach(i => {
      checkSelect(i);
      commands[i.name] = i.value;
    });
    const commandsChanged = Object.keys(commands).some(i => commands[i] !== pref.commands[i]);
    pref.commands = commands;                               // set to pref

    // --- check sync
    if (this.sync.checked) {
      // convert array to object {...data} to avoid sync maximum item size limit
      const obj = dataChanged ? {...data} : {};

      // check if global Exclude have changed
      if (globalExcludeChanged) {
        obj.globalExcludeRegex = this.globalExcludeRegex.value;
        obj.globalExcludeWildcard = this.globalExcludeWildcard.value;
      }

      pref.proxyDNS !== this.proxyDNS.checked && (obj.proxyDNS = this.proxyDNS.checked);

      containerChanged && (obj.container = pref.container);
      commandsChanged && (obj.commands = pref.commands);

      // save changes to sync
      Object.keys(obj)[0] && browser.storage.sync.set(obj)
        .catch(error => App.notify(browser.i18n.getMessage('syncError') + '\n\n' + error.message));
    }

    // --- check mode
    // get from storage in case it was changed while options page has been open
    const m = await browser.storage.local.get({mode: 'disable'});
    let mode = m.mode;
    switch (true) {
      case pref.mode.includes('://') && !pref.data.some(i => i.active && i.type === 'pac' && mode === i.pac):
      case pref.mode.includes(':') && !pref.data.some(i => i.active && i.type !== 'pac' && mode === `${i.hostname}:${i.port}`):
      case pref.mode === 'pattern' && !pref.data.some(i => i.active && i.include[0]):
        mode = 'disable';
        break;
    }
    pref.mode = mode;

    // --- update Proxy
    browser.runtime.sendMessage({id: 'setProxy', pref});

    // --- save options
    this.process(true);
  }

  static checkGlobalExclude(elem) {
    elem.classList.remove('invalid');                       // reset
    // --- clean up global exclude, remove duplicates
    const arr = [...new Set(elem.value.trim().split(/\n+/))];
    elem.value = arr.join('\n');
    if (!arr[0]) { return true; }

    const type = elem.id.endsWith('Wildcard') ? 'wildcard' : 'regex';
    for(const item of arr) {                                // using for loop to be able to break early
      if (!Pattern.validate(item, type, true)) {
        Nav.get('options');                                 // show Options tab
        elem.classList.add('invalid');
        return;
      }
    }
    return true;
  }

  static getProxyDetails(elem) {
    // blank proxy
    const obj = {
      active: true,
      title: '',
      color: '',
      type: 'http',
      hostname: '',
      port: '',
      username: '',
      password: '',
      cc: '',
      city: '',
      include: [],
      exclude: [],
      pac: ''
    };

    // --- populate values
    elem.querySelectorAll('[data-id]').forEach(i => {
      i.classList.remove('invalid');                        // reset
      obj[i.dataset.id] = i.type === 'checkbox' ? i.checked : i.value.trim()
    });


    // --- check type: http | https | socks4 | socks5 | pac | direct
    switch (true) {
      // DIRECT
      case obj.type === 'direct':
        obj.hostname = 'DIRECT';
        break;

      // PAC
      case obj.type === 'pac':
        const {hostname, port} = App.parseURL(obj.pac);
        if (!hostname) {
          this.setInvalid(elem, 'pac');
          // alert(browser.i18n.getMessage('pacUrlError'));
          return;
        }
        obj.hostname = hostname;
        obj.port = port;
        break;

      // http | https | socks4 | socks5
      case !obj.hostname:
        this.setInvalid(elem, 'hostname');
        alert(browser.i18n.getMessage('hostnamePortError'));
        return;

      case !obj.port:
        this.setInvalid(elem, 'port');
        alert(browser.i18n.getMessage('hostnamePortError'));
        return;
    }

    // --- check & build patterns
    for (const item of elem.querySelectorAll('.patternBox .patternRow')) {
      const elem = item.children;
      elem[4].classList.remove('invalid');                  // reset
      const pat = {
        type: elem[2].value,
        title: elem[3].value.trim(),
        pattern: elem[4].value.trim(),
        active: elem[5].checked,
      };

      // --- test pattern
      if (!pat.pattern) { continue; }                       // blank pattern

      if (!Pattern.validate(pat.pattern, pat.type, true)) {
        Nav.get('proxies');                                 // show Proxy tab
        const details = item.closest('details');
        details.open = true;                                // open proxy
        elem[4].classList.add('invalid');
        elem[4].scrollIntoView({behavior: 'smooth'});
        return;
      }

      obj[elem[1].value].push(pat);
    }
    return obj;
  }

  static setInvalid(parent, id) {
    parent.open = true;
    const elem = parent.querySelector(`[data-id="${id}"]`);
    elem.classList.add('invalid');
    parent.scrollIntoView({behavior: 'smooth'});
  }

  static restoreDefaults() {
    if (!confirm(browser.i18n.getMessage('restoreDefaultsConfirm'))) { return; }

    const db = App.getDefaultPref();
    Object.keys(db).forEach(i => pref[i] = db[i]);
    this.process();
    Proxies.process();
  }

  // --- container & commands
  static fillContainerCommands() {
    // reset
    this.clearSelect(this.container);
    this.clearSelect(this.commands);

    const docFrag = document.createDocumentFragment();
    const docFragPAC = docFrag.cloneNode();

    // filter out PAC
    pref.data.filter(i => i.active).forEach(item => {
      const flag = App.getFlag(item.cc);
      const value = item.type === 'pac' ? item.pac : `${item.hostname}:${item.port}`;
      const opt = new Option(flag + ' ' + (item.title || value), value);
      // opt.style.color = item.color;                         // supported on Chrome, not on Firefox

      docFragPAC.appendChild(opt);
      item.type !== 'pac' && docFrag.appendChild(opt.cloneNode(true));
    });

    this.container.forEach(i => {
      i.appendChild(docFrag.cloneNode(true));
      pref.container[i.name] && (i.value = pref.container[i.name]);
    });

    this.commands.forEach(i => {
      const frag = i.name === 'setProxy' ? docFragPAC : docFrag;
      i.appendChild(frag.cloneNode(true));
      pref.commands[i.name] && (i.value = pref.commands[i.name]);
    });
  }

  static clearSelect(elem) {
    // remove children except the first one
    elem.forEach(i =>
      [...i.children].forEach((opt, idx) => idx && opt.remove())
    );
  }
}
// ---------- /Options -------------------------------------

// ---------- browsingData ---------------------------------
class BrowsingData {

  static {
    document.querySelector('#deleteBrowsingData').addEventListener('click', () => this.process());
    this.init();
  }

  static async init() {
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/permissions/request
    // Any permissions granted are retained by the extension, even over upgrade and disable/enable cycling.
    // check if permission is granted
    this.permission = await browser.permissions.contains({permissions: ['browsingData']});
  }

  static async process() {
    if (!this.permission) {
      // request permission
      // Chrome appears to return true, granted silently without a popup prompt
      this.permission = await browser.permissions.request({permissions: ['browsingData']});
      if (!this.permission) { return; }
    }

    if (!confirm(browser.i18n.getMessage('deleteBrowsingDataConfirm'))) { return; }

    browser.browsingData.remove({}, {
      cookies: true,
      indexedDB: true,
      localStorage: true
    })
   .catch(error => App.notify(browser.i18n.getMessage('deleteBrowsingData') + '\n\n' + error.message));
 }
}
// ---------- /browsingData --------------------------------

// ---------- WebRTC ---------------------------------------
class WebRTC {

  static {
    this.webRTC = document.querySelector('#limitWebRTC');
    this.webRTC.addEventListener('change', () => this.process());
    this.init();
  }

  static async init() {
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/permissions/request
    // Any permissions granted are retained by the extension, even over upgrade and disable/enable cycling.
    // check if permission is granted
    this.permission = await browser.permissions.contains({permissions: ['privacy']});

    // check webRTCIPHandlingPolicy
    if (this.permission) {
      this.result = await browser.privacy.network.webRTCIPHandlingPolicy.get({});
      this.webRTC.checked = this.result.value !== 'default';
    }
  }

  static async process() {
    if (!this.permission) {
      // request permission, Firefox for Android version 102
      this.permission = await browser.permissions.request({permissions: ['privacy']});
      if (!this.permission) {
        this.webRTC.checked = false;
        return;
      }
    }

    // https://bugzilla.mozilla.org/show_bug.cgi?id=1790270
    // WebRTC bypasses Network settings & proxy.onRequest
    // { "levelOfControl": "controllable_by_this_extension", "value": "default" }
    this.result ||= await browser.privacy.network.webRTCIPHandlingPolicy.get({});
    const def = this.result.value === 'default'
    let value = def ? 'default_public_interface_only' : 'default';
    this.result.value = value;
    this.webRTC.checked = def;                              // was default but now changed
    browser.privacy.network.webRTCIPHandlingPolicy.set({value});
  }
}
// ---------- /WebRTC --------------------------------------

// ---------- Proxies --------------------------------------
class Proxies {

  static {
    this.docFrag = document.createDocumentFragment();
    this.proxyDiv = document.querySelector('div.proxyDiv');
    const temp = document.querySelector('.proxySection template').content;
    this.proxyTemplate = temp.firstElementChild;
    this.patternTemplate = temp.lastElementChild;

    // --- buttons
    document.querySelector('.proxySection .proxyTop button[data-i18n="getLocation"]').addEventListener('click', () => this.getLocation());
    document.querySelector('.proxySection .proxyTop button[data-i18n="add"]').addEventListener('click', () => this.addProxy());

    // --- proxy filter
    const filter = document.querySelector('#filter');
    filter.value = '';                                      // reset after reload
    filter.addEventListener('input', e => this.filterProxy(e));

    this.proxyCache = {};                                   // used to find proxy
    Log.proxyCache = this.proxyCache;                       // used to get the denials for the log

    this.process();
  }

  static process() {
    this.proxyDiv.textContent = '';                         // reset
    pref.data.forEach(i => this.addProxy(i));
    this.proxyDiv.appendChild(this.docFrag);
  }

  static addProxy(item) {
    // --- make a blank proxy with all event listeners
    const pxy = this.proxyTemplate.cloneNode(true);
    const proxyBox = pxy.children[1].children[0];
    const patternBox = pxy.children[1].children[2];

    // --- summary
    const sum = pxy.children[0].children;
    sum[3].addEventListener('click', () => confirm(browser.i18n.getMessage('deleteConfirm')) && pxy.remove());
    sum[4].addEventListener('click', () => pxy.previousElementSibling?.before(pxy));
    sum[5].addEventListener('click', () => pxy.nextElementSibling?.after(pxy));

    // proxy details
    const elem = proxyBox.children;
    elem[1].addEventListener('change', function () {
      sum[1].textContent = this.value;
    });

    elem[5].addEventListener('change', function () {
      // hide/show elements
      // this.parentElement.dataset.type = this.value;
      // this.parentElement.previousElementSibling.dataset.type = this.value;

      switch (this.options[this.selectedIndex].textContent) {
        case 'TOR':
          sum[0].textContent = '🌎';
          sum[1].textContent = 'TOR';
          elem[1].value = 'TOR';
          elem[3].value = '127.0.0.1';
          elem[7].value = '9050';
          break;

        case 'Psiphon':
          sum[0].textContent = '🌎';
          sum[1].textContent = 'Psiphon';
          elem[1].value = 'Psiphon';
          elem[3].value = '127.0.0.1';
          elem[7].value = '60351';
          break;

        case 'Privoxy':
          sum[0].textContent = '🌎';
          sum[1].textContent = 'Privoxy';
          elem[1].value = 'Privoxy';
          elem[3].value = '127.0.0.1';
          elem[7].value = '8118';
          break;

        case 'PAC':
          sum[0].textContent = '🌎';
          sum[1].textContent = 'PAC';
          elem[1].value = 'PAC';
          break;

        case 'DIRECT':
          sum[0].textContent = '⮕';
          sum[1].textContent = 'DIRECT';
          elem[1].value = 'DIRECT';
          elem[3].value = 'DIRECT';
          break;
        }
    });
    elem[9].addEventListener('change', function () {
      sum[0].textContent = App.getFlag(this.value);
    });
    elem[15].children[1].addEventListener('click', Toggle.password);

    // random color
    const color = item?.color || Color.getRandom();
    pxy.children[0].style.borderLeftColor = color;
    elem[17].children[0].value = color;
    elem[17].children[0].addEventListener('change', function () {
      pxy.children[0].style.borderLeftColor = this.value;
    });

    elem[17].children[1].addEventListener('click', function () {
      this.previousElementSibling.value = Color.getRandom();
      pxy.children[0].style.borderLeftColor = this.previousElementSibling.value;
    });

    elem[19].addEventListener('change', function () {
      const {hostname, port} = App.parseURL(this.value);
      if (!hostname) {
        this.classList.add('invalid');
        return;
      }
      elem[3].value = hostname;
      port && (elem[7].value = port);
    });

    // patterns
    pxy.querySelector('button[data-i18n="add"]').addEventListener('click', () => this.addPattern(patternBox));

    // from add button
    if (!item) {
      this.proxyDiv.appendChild(pxy);                       // insert blank proxy
      pxy.open = true;                                      // open the proxy details
      elem[1].focus();
      pxy.scrollIntoView({behavior: 'smooth'});
      return;
    }

    const id = item.type === 'pac' ? item.pac : `${item.hostname}:${item.port}`;
    this.proxyCache[id] = item;                             // cache to find later

    // --- populate with data
    const title = item.title || id;

    // --- summary
    sum[0].textContent = App.getFlag(item.cc);
    sum[1].textContent = title;
    sum[2].checked = item.active;

    // toggle button (hide/show elements)
    pxy.children[1].children[0].dataset.type = item.type;

    // proxy details
    elem[1].value = title;
    elem[3].value = item.hostname;
    elem[5].value = item.type;
    elem[7].value = item.port;
    elem[9].value = item.cc;
    elem[9].dataset.hostname = item.hostname;               // for Get Location
    elem[11].value = item.username;
    elem[13].value = item.city;
    elem[13].dataset.hostname = item.hostname;              // for Get Location
    elem[15].children[0].value = item.password;
    elem[19].value = item.pac;

    // patterns
    item.include.forEach(i => this.addPattern(patternBox, i, 'include'));
    item.exclude.forEach(i => this.addPattern(patternBox, i, 'exclude'));

    // return pxy;
    this.docFrag.appendChild(pxy);
  }

  static addPattern(parent, item, inc) {
    // --- make a blank pattern with all event listeners
    const div = this.patternTemplate.cloneNode(true);
    const elem = div.children;

    elem[0].addEventListener('change', function () {
      const opt = this.options[this.selectedIndex];
      elem[2].value = opt.dataset.type;
      elem[3].value = opt.textContent;
      elem[4].value = opt.value;
      this.selectedIndex = 0;                               // reset select option
    });
    elem[6].addEventListener('click', () => {
      Tester.select.value = elem[2].value;
      Tester.pattern.value = elem[4].value;
      Tester.target = elem[4];
      Nav.get('tester');                                    // navigate to Tester tab
    });
    // elem[7].addEventListener('click', () => confirm(browser.i18n.getMessage('deleteConfirm')) && div.remove());
    elem[7].addEventListener('click', () => div.remove());

    if (item) {
      elem[1].value = inc;
      elem[2].value = item.type;
      elem[3].value = item.title;
      elem[4].value = item.pattern;
      elem[5].checked = item.active;
    }

    parent.appendChild(div);
  }

  static getLocation() {
    // filter & remove duplicates
    const ignore = ['DIRECT', '127.0.0.1', 'localhost'];
    const list = pref.data.filter(i => !ignore.includes(i.hostname)).map(i => i.hostname);
    const hosts = [...new Set(list)];
    if (!hosts[0]) { return; }

    Spinner.show();

    fetch('https://getfoxyproxy.org/webservices/lookup.php?' + hosts.join('&'))
    .then(response => response.json())
    .then(json => this.updateLocation(json))
    .catch(error => {
      Spinner.hide();
      alert(error);
    });
  }

  static updateLocation(json) {
    // update display
    this.proxyDiv.querySelectorAll('[data-id="cc"], [data-id="city"]').forEach(item => {
      const {hostname, id} = item.dataset;
      const value = item.value;                             // cache old value to compare
      json[hostname]?.[id] && (item.value = json[hostname][id]);
      id === 'cc' && item.value !== value && item.dispatchEvent(new Event('change')); // dispatch change event
    });

    Spinner.hide();
  }

  static filterProxy(e) {
    const str = e.target.value.toLowerCase().trim();
    if (!str) {
      [...this.proxyDiv.children].forEach(i => i.classList.remove('off'));
      return;
    }

    [...this.proxyDiv.children].forEach(item => {
      const title = item.children[1].children[0].children[1].value;
      const hostname = item.children[1].children[0].children[3].value;
      const port = ':' + item.children[1].children[0].children[7].value;
      item.classList.toggle('off', ![title, hostname, port].some(i => i.toLowerCase().includes(str)));
    });
  }
}
// ---------- /Proxies -------------------------------------

// ---------- Drag and Drop --------------------------------
class Drag {

  static {
    this.proxyDiv = document.querySelector('div.proxyDiv');
    this.proxyDiv.addEventListener('dragover', e => this.dragover(e));
    this.proxyDiv.addEventListener('dragend', e => this.dragend(e));
    this.target = null;
  }

  static dragover(e) {
    const target = e.target.closest('details');
    target && (this.target = target);
  }

  static dragend(e) {
    if (!this.target) { return; }

    const arr = [...this.proxyDiv.children];
    arr.indexOf(e.target) > arr.indexOf(this.target) ? this.target.before(e.target) : this.target.after(e.target);
  }
}
// ---------- /Drag and Drop -------------------------------

// ---------- Import FP Account ----------------------------
class ImportFoxyProxyAccount {

  static {
    this.username = document.querySelector('.importAccount #username');
    this.password = document.querySelector('.importAccount #password');
    document.querySelector('.importAccount button[data-i18n="togglePassword|title"]').addEventListener('click', Toggle.password);
    document.querySelector('.importAccount button[data-i18n="import"]').addEventListener('click', () => this.process());
  }

  static async process() {
    // --- check username/password
    const username = this.username.value.trim();
    const password = this.password.value.trim();
    if (!username || !password) {
      alert(browser.i18n.getMessage('userPassError'));
      return;
    }

    Spinner.show();

    // --- fetch data
    const data = await this.getAccount(username, password);
    if (data) {
      data.forEach(item => {
        // proxy template
        const pxy = {
          active: true,
          title: '',
          color: '',                                        // random color will be set
          type: 'http',
          hostname: item.hostname,
          port: '443',
          username: item.username,
          password: item.password,
          cc: item.country_code === 'UK' ? 'GB' : item.country_code, // convert UK to ISO 3166-1 GB
          city: item.city,
          include: [],
          exclude: [],
          pac: ''
        };

        const title = item.hostname.split('.')[0];
        // add http port
        pxy.title = title + '.' + item.port[0];
        pxy.port = item.port[0];
        Proxies.addProxy(pxy);
        // add SSL port
        pxy.title = title + '.' + item.ssl_port;
        pxy.port = item.ssl_port;
        Proxies.addProxy(pxy);
      });

      Proxies.proxyDiv.appendChild(Proxies.docFrag);
      Nav.get('proxies');
    }

    Spinner.hide();
  }

  static async getAccount(username, password) {
    // --- fetch data
    return fetch('https://getfoxyproxy.org/webservices/get-accounts.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body:  `username=${encodeURIComponent(username)}&password=${(encodeURIComponent(password))}`
    })
    .then(response => response.json())
    .then(data => {
      if (!Array.isArray(data) || !data[0]?.hostname) {
        App.notify(browser.i18n.getMessage('error'));
        return;
      }

      data = data.filter(i => i.active === 'true');         // import active accounts only
      data.sort((a, b) => a.country.localeCompare(b.country)); // sort by country
      return data;
    })
    .catch(error => App.notify(browser.i18n.getMessage('error') + '\n\n' + error.message));
  }
}
// ---------- /Import FP Account ---------------------------

// ---------- Import From URL ------------------------------
class importFromUrl {

  static {
    this.input = document.querySelector('.importFromUrl input');
    document.querySelector('.importFromUrl button').addEventListener('click', () => this.process());
  }

  static process() {
    this.input.value = this.input.value.trim();
    if (!this.input.value) { return; }

    Spinner.show();

    // --- fetch data
    fetch(this.input.value)
    .then(response => response.json())
    .then(data => {
      // update pref with the saved version
      Object.keys(pref).forEach(i => data.hasOwnProperty(i) && (pref[i] = data[i]));

      Options.process();                                    // set options after the pref update
      Proxies.process();                                    // update page display
      Nav.get('proxies');                                   // show Proxy tab
      Spinner.hide();
    })
    .catch(error => {
      App.notify(browser.i18n.getMessage('error') + '\n\n' + error.message);
      Spinner.hide();
    });
  }
}
// ---------- /Import From URL -----------------------------

// ---------- Import List ----------------------------------
class ImportProxyList{

  static {
    this.textarea = document.querySelector('.importProxyList textarea');
    document.querySelector('.importProxyList button').addEventListener('click', () => this.process());
  }

  static process() {
    this.textarea.value = this.textarea.value.trim();
    if (!this.textarea.value) { return; }

   for (const item of this.textarea.value.split(/\n+/)) {
      // simple vs Extended format
      const pxy = item.includes('://') ? this.parseExtended(item) : this.parseSimple(item);
      if (!pxy) {
        // end on error
        Proxies.docFrag.textContent = '';
        return;
      }

      Proxies.addProxy(pxy);
    }

    Proxies.proxyDiv.appendChild(Proxies.docFrag);
    Nav.get('proxies');
  }

  static parseSimple(item) {
    // example.com:3128:user:pass
    const [hostname, port, username = '', password = ''] = item.split(':');
    if (!hostname || !port || !(port*1)) {
      alert(`Error: ${item}`);
      return;
    }

    // proxy template
    const pxy = {
      active: true,
      title: '',
      color: '',
      type: 'http',
      hostname,
      port,
      username,
      password,
      cc: '',
      city: '',
      include: [],
      exclude: [],
      pac: ''
    };

    return pxy;
  }

  static parseExtended(item) {
    // https://user:password@78.205.12.1:21?color=ff00bc&title=work%20proxy
    // https://example.com:443?active=false&title=Work&username=abcd&password=1234&cc=US&city=Miami

    // convert old schemes to type
    let url;
    try { url = new URL(item); }
    catch (error) {
      alert(`${error}\n\n${item}`);
      return;
    }

    // convert old schemes to type
    let type = url.protocol.slice(0, -1);
    if (!['http', 'https'].includes(type)) {
      const scheme = {
        proxy: 'http',
        ssl: 'https',
        socks4: 'socks4',
        socks5: 'socks5',
        socks: 'socks5',
      };

      scheme[type] && (type = scheme[type]);
      url.protocol = 'http:';
      url = new URL(url);
    }

    const {hostname, port, username, password} = url;
    // set to pram, can be overridden in searchParams
    const pram = {type, hostname, port, username, password};

    // prepare object, make parameter keys case-insensitive
    for (let [key, value] of url.searchParams) {
      pram[key.toLowerCase()] = value;
    }

    // proxy template
    const pxy = {
      active: pram.active !== 'false',                      // defaults to true
      title: pram.title || '',
      color: pram.color ? '#' + pram.color : '',
      type: pram.type.toLowerCase(),
      hostname: pram.hostname,
      port: pram.port,
      username: decodeURIComponent(pram.username),
      password: decodeURIComponent(pram.password),
      cc: (pram.cc || pram.countrycode || '').toUpperCase(),
      city: pram.city || '',
      include: [],
      exclude: [],
      pac: pram.pac || (pram.type === 'pac' && url.origin + url.pathname) || ''
    };

    return pxy;
  }
}
// ---------- /Import List ---------------------------------

// ---------- Import Older Export --------------------------
class importFromOlder {

  static {
    document.querySelector('.importFromOlder input').addEventListener('change', e => this.process(e));
  }

  static process(e) {
    const file = e.target.files[0];
    switch (true) {
      case !file: App.notify(browser.i18n.getMessage('error')); return;
      case !['text/plain', 'application/json'].includes(file.type): // check file MIME type
        App.notify(browser.i18n.getMessage('fileTypeError'));
        return;
    }

    const reader  = new FileReader();
    reader.onloadend = () => this.parseJSON(reader.result);
    reader.onerror = () => App.notify(browser.i18n.getMessage('fileReadError'));
    reader.readAsText(file);
  }

  static parseJSON(data) {
    try { data = JSON.parse(data); }
    catch(e) {
      App.notify(browser.i18n.getMessage('fileParseError')); // display the error
      return;
    }

    data = data.hasOwnProperty('settings') ? Migrate.convert3(data) : Migrate.convert7(data);
    // update pref with the saved version
    Object.keys(pref).forEach(i => data.hasOwnProperty(i) && (pref[i] = data[i]));

    Options.process();                                      // set options after the pref update
    Proxies.process();                                      // update page display
    Nav.get('proxies');                                     // show Proxy tab
  }
}
// ---------- /Import Older Export -------------------------

// ---------- Tester ---------------------------------------
class Tester {

  static {
    this.url = document.querySelector('.tester input[type="url"]');
    this.select = document.querySelector('.tester select');
    this.pattern = document.querySelector('.tester input[type="text"]');
    this.result = document.querySelector('.tester .testResult');
    document.querySelector('.tester button[data-i18n="back"]').addEventListener('click', () => this.back());
    document.querySelector('.tester button[data-i18n="test"]').addEventListener('click', () => this.process());
  }

  static process() {
    // --- reset
    this.pattern.classList.remove('invalid');
    this.result.textContent = '';

    this.url.value = this.url.value.trim();
    this.pattern.value = this.pattern.value.trim();
    if(!this.url.value  || !this.pattern.value ) {
      this.result.textContent = '❌';
      return;
    }

    // convert wildcard to regex string if needed
    const str = Pattern.get(this.pattern.value, this.select.value);

    // test regex string
    let regex;
    try {
      regex = new RegExp(str, 'i');
    }
    catch (error) {
      this.pattern.classList.add('invalid');
      this.result.textContent = error;
      return;
    }

    this.result.textContent = regex.test(this.url.value) ? '✅' : '❌';
  }

  static back() {
    if (!this.target) { return; }

    Nav.get('proxies');                                     // show Proxy tab
    const details = this.target.closest('details');
    details.open = true;                                    // open proxy
    this.target.scrollIntoView({behavior: 'smooth'});
    this.target.focus();
  }
}
// ---------- /Tester --------------------------------------

// ---------- Import/Export Preferences --------------------
ImportExport.init(pref, () => {
  Options.process();                                        // set options after the pref update
  Proxies.process();                                        // update page display
});
// ---------- /Import/Export Preferences -------------------

// ---------- Navigation -----------------------------------
Nav.get();