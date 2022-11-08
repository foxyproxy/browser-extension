import {pref, App, ImportExport} from './app.js';
import {Pattern} from './pattern.js';
import {Migrate} from './migrate.js';
import {Location} from './location.js';
import {Color} from './color.js';
import {Menus} from './menus.js';
import './i18n.js';

// ----------------- Spinner -------------------------------
class Spinner {
  static spinner = document.querySelector('.spinner');

  static on() {
    this.spinner.classList.add('on');
  }

  static off() {
    this.spinner.classList.remove('on');
  }
}

// ----------------- Progress Bar --------------------------
class ProgressBar {

  static bar = document.querySelector('.progressBar');

  static show() {
    this.bar.classList.toggle('on');
    setTimeout(() => this.bar.classList.toggle('on'), 2000);
  }
}

// ----------------- Options -------------------------------
class Options {

  constructor(keys = Object.keys(pref)) {
    this.prefNode = document.querySelectorAll('#' + keys.join(',#')); // defaults to pref keys
    document.querySelectorAll('button[type="submit"]').forEach(item => item.addEventListener('click', () => this.check())); // submit button

    this.sync = document.getElementById('sync');
    this.proxyDNS = document.getElementById('proxyDNS');

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
    document.querySelector('.options button[data-i18n="deleteBrowserData"]').addEventListener('click', () => this.deleteBrowserData());
    document.querySelector('.options button[data-i18n="restoreDefaults"]').addEventListener('click', () => this.restoreDefaults());

    // --- webRTC
    const webRTC = document.querySelector('.options button[data-i18n="limitWebRTC"]');
    webRTC.addEventListener('click', this.toggleWebRTC);
    this.setWebRTC(webRTC);

    // --- proxy
    const temp = document.querySelector('.proxySection template').content;
    this.proxyTemplate = temp.firstElementChild;
    this.patternTemplate = temp.lastElementChild;
    this.proxyFieldset = document.querySelector('.proxySection fieldset');

    // --- buttons
    document.querySelector('.proxySection .proxyTop button[data-i18n="getLocation"]').addEventListener('click', () => this.getLocationData());
    document.querySelector('.proxySection .proxyTop button[data-i18n="add"]').addEventListener('click', () => this.addProxy());

    // --- proxy filter
    const filter = document.querySelector('.proxySection .proxyTop input');
    filter.value = '';                                      // reset after reload
    filter.addEventListener('input', e => this.filterProxy(e));

    // --- navigation
    this.navOptions = document.getElementById('nav3');
    this.navProxy = document.getElementById('nav4');
    this.navTester = document.getElementById('nav5');

    // --- Incognito Access
    // https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/proxy/settings
    // Changing proxy settings requires private browsing window access because proxy settings affect private and non-private windows.
    App.firefox && browser.extension.isAllowedIncognitoAccess()
    .then(response => !response && alert(browser.i18n.getMessage('incognitoAccess')));
  }

  process(save) {
    // 'save' is only set when clicking the button to save options
    this.prefNode.forEach(node => {
      // value: 'select-one', 'textarea', 'text', 'number'
      const attr = node.type === 'checkbox' ? 'checked' : 'value';
      save ? pref[node.id] = node[attr] : node[attr] = pref[node.id];
    });

    save && !ProgressBar.show() && browser.storage.local.set(pref); // update saved pref
  }

  check() {
    // --- global exclude
    if (!this.checkGlobalExclude(this.globalExcludeWildcard)) { return; };
    if (!this.checkGlobalExclude(this.globalExcludeRegex)) { return; };
    const globalExcludeChanged = pref.globalExcludeWildcard !== this.globalExcludeWildcard.value ||
      pref.globalExcludeRegex !== this.globalExcludeRegex.value;

    // --- check and build proxies & patterns
    const ids = [];
    const data = [];
    for (const item of this.proxyFieldset.children) {
      if (item.nodeName !== 'DETAILS') { continue; }
      item.classList.remove('invalid');                     // reset
      const pxy = this.getProxyDetails(item);
      if (!pxy) {
        item.open = true;                                   // open the proxy details
        item.classList.add('invalid');
        item.scrollIntoView({behavior: 'smooth', block: 'center'});
        return;
      }

      // check for duplicate
      const id = pxy.type === 'pac' ? pxy.pac : `${pxy.hostname}:${pxy.port}`;
      if (ids.includes(id)) {
        item.open = true;                                   // open the proxy details
        item.classList.add('invalid');
        item.scrollIntoView({behavior: 'smooth', block: 'center'});
        alert(browser.i18n.getMessage('proxyDuplicateError'));
        return;
      }

      ids.push(id);
      data.push(pxy);
    }
    const dataChanged = !App.equal(pref.data, data);        // check if proxies & patterns have changed
    pref.data = data;

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

      // save changes to sync
      Object.keys(obj)[0] && browser.storage.sync.set(obj)
        .catch(error => App.notify(browser.i18n.getMessage('syncError') + '\n\n' + error.message));
    }

    // --- create contextMenus
    Menus.create(pref);

    // check mode in case it was changed while options page has been open
    const mode = localStorage.getItem('mode');
    mode && (pref.mode = mode);

    // --- update PAC if Proxy by Pattern or Single Proxy
    const isPattern = pref.mode === 'pattern';
    const isProxy = /^[^:]+:\d+$/.test(pref.mode);
    if ((globalExcludeChanged && (isPattern || isProxy)) || (dataChanged && isPattern)) {
      browser.runtime.sendMessage({id: 'setPAC', pref});
    }

    // --- save options
    this.process(true);
  }

  checkGlobalExclude(elem) {
    elem.classList.remove('invalid');                       // reset
    // --- clean up global exclude, remove duplicates
    const arr = [...new Set(elem.value.trim().split(/\n+/))];
    elem.value = arr.join('\n');
    if (!arr[0]) { return true; }

    const type = elem.id.endsWith('Wildcard') ? 'wildcard' : 'regex';
    for(const item of arr) {                                // using for loop to be able to break early
      if (!Pattern.validate(item, type, true)) {
        this.navOptions.checked = true;                     // show Options tab
        elem.classList.add('invalid');
        return;
      }
    }
    return true;
  }

  getProxyDetails(node) {
    const pxy = {
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

    node.querySelectorAll('.proxyBox [data-id]').forEach(item => {
      const id = item.dataset.id;
      switch (item.type) {
        case 'checkbox':
          pxy[id] = item.checked;
          break;

        case 'text':
        case 'password':
          item.value = item.value.trim();
          pxy[id] = item.value;
          break;

        default:
          pxy[id] = item.value;
      }
    });

    if (pxy.type === 'pac' && !pxy.pac) {
      alert(browser.i18n.getMessage('pacUrlError'));
      return;
    }
    else if (!pxy.type === 'pac' && (!pxy.hostname || pxy.port)) {
      alert(browser.i18n.getMessage('hostnamePortError'));
      return;
    }

    // check & build patterns
    for (const item of node.querySelectorAll('.patternBox .patternRow')) {
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
        this.navProxy.checked = true;                       // show Proxy tab
        const detailsProxy = item.closest('details');
        detailsProxy.open = true;                           // open proxy
        detailsProxy.children[1].children[0].open = true;   // open pattern
        item.parentElement.parentElement.firstElementChild.open = true; // show patterns
        elem[4].classList.add('invalid');
        return;
      }

      pxy[elem[1].value].push(pat);
    }
    return pxy;
  }

  deleteBrowserData() {
     if (!confirm(browser.i18n.getMessage('deleteBrowserDataConfirm'))) { return; }
    browser.browsingData.remove({}, {
      cookies: true,
      indexedDB: true,
      localStorage: true
    })
    .catch(error => App.notify(browser.i18n.getMessage('deleteBrowserData') + '\n\n' + error.message));
  }

  restoreDefaults() {
    const defaultPref = {
      mode: 'disable',
      sync: false,
      proxyDNS: true,
      globalExcludeWildcard: '',
      globalExcludeRegex: '',
      data: []
    };
    this.prefNode.forEach(node => {
      const attr = node.type === 'checkbox' ? 'checked' : 'value';
      node[attr] = defaultPref[node.id];
    });
    this.deleteProxies();
/*
    if (!confirm(browser.i18n.getMessage('restoreDefaultsConfirm'))) { return; }
    const defaultPref = {
      mode: 'disable',
      sync: false,
      proxyDNS: true,
      globalExcludeWildcard: '',
      globalExcludeRegex: '',
      data: []
    };
    browser.storage.local.set(defaultPref)
    .then(() => location.reload());
   */
  }

  processProxy() {
    const docFrag = document.createDocumentFragment();
    pref.data.forEach(item => docFrag.appendChild(this.makeProxy(item)));
    this.proxyFieldset.insertBefore(docFrag, this.proxyFieldset.lastElementChild);
  }

  addProxy(pxy) {
    this.proxyFieldset.insertBefore(this.makeProxy(pxy), this.proxyFieldset.lastElementChild);
  }

  makeProxy(item) {
    // --- make a blank proxy with all event listeners
    const pxy = this.proxyTemplate.cloneNode(true);

    // summary
    const sum = pxy.children[0].children;
    sum[3].addEventListener('click', () => confirm(browser.i18n.getMessage('deleteConfirm')) && pxy.remove());
    sum[4].addEventListener('click', () => pxy.previousElementSibling.nodeName === 'DETAILS' && pxy.previousElementSibling.before(pxy));
    sum[5].addEventListener('click', () => pxy.nextElementSibling.nodeName === 'DETAILS' && pxy.nextElementSibling.after(pxy));

    // proxy details
    const elem = pxy.children[1].children[1].children;      // proxyBox
    elem[1].addEventListener('change', function() {
      sum[1].textContent = this.value;
    });

    elem[5].addEventListener('change', function() {
      // hide/show elements
      this.parentElement.dataset.type = this.value;
      this.parentElement.previousElementSibling.dataset.type = this.value;

      switch (this.options[this.selectedIndex].textContent) {
        case 'TOR':
          sum[0].textContent = '🌎';
          sum[1].textContent = 'TOR'
          elem[1].value = 'TOR';
          elem[3].value = '127.0.0.1';
          elem[7].value = '9050';
          break;

        case 'Psiphon':
          sum[0].textContent = '🌎';
          sum[1].textContent = 'Psiphon'
          elem[1].value = 'Psiphon';
          elem[3].value = '127.0.0.1';
          elem[7].value = '60351';
          break;
      }
    });
    elem[9].addEventListener('change', function() {
      sum[0].textContent = App.getFlag(this.value);
    });
    elem[15].children[1].addEventListener('click', this.togglePassword);

    // random color
    const color = item?.color || Color.getRandom();
    pxy.children[0].style.borderLeftColor = color;
    elem[17].children[0].value = color;
    elem[17].children[0].addEventListener('change', function() {
      pxy.children[0].style.borderLeftColor = this.value;
    });

    elem[17].children[1].addEventListener('click', function() {
      this.previousElementSibling.value = Color.getRandom();
      pxy.children[0].style.borderLeftColor = this.previousElementSibling.value;
    });

    // patterns
    const patDiv = pxy.querySelector('.patternRowBox');
    pxy.querySelector('button[data-i18n="add"]').addEventListener('click', () =>
      patDiv.appendChild(this.makePattern()));

    if (!item) { return pxy; }                              // return blank proxy

    // --- populate with data
    const title = App.getTitle(item);

    // summary
    // pxy.children[0].style.borderLeftColor = item.color;
    sum[0].textContent = App.getFlag(item.cc);
    sum[0].title = Location.get(item);
    sum[1].textContent = title;
    sum[2].checked = item.active;

    // toggle button (hide/show elements)
    pxy.children[1].children[0].dataset.type = item.type;

    // proxy details
    elem[1].value = title;
    elem[3].value = item.hostname;
    elem[5].value = item.type;
    elem[5].parentElement.dataset.type = item.type;         // hide/show elements
    elem[7].value = item.port;
    elem[9].value = item.cc;
    elem[11].value = item.username;
    elem[13].value = item.city;
    elem[15].children[0].value = item.password;
    // elem[17].value = item.color;
    elem[19].value = item.pac;
//    elem[20].firstElementChild.checked = item.proxyDNS;

    // patterns
    item.include.forEach(i => this.addPattern(patDiv, i, 'include'));
    item.exclude.forEach(i => this.addPattern(patDiv, i, 'exclude'));

    return pxy;
  }

  // make a blank pattern with all event listeners
  makePattern() {
    const div = this.patternTemplate.cloneNode(true);
    const elem = div.children;

    elem[0].addEventListener('change', function() {
      const opt = this.options[this.selectedIndex];
      elem[2].value = opt.dataset.type;
      elem[3].value = opt.textContent;
      elem[4].value = opt.value;
      this.selectedIndex = 0;                               // reset select option
    });
    elem[6].addEventListener('click', () => {
      tester.select.value = elem[2].value;
      tester.pattern.value = elem[4].value;
      this.navTester.checked = true;                        // navigate to Tester tab
    });
    elem[7].addEventListener('click', () => confirm(browser.i18n.getMessage('deleteConfirm')) && div.remove());
    return div;
  }

  addPattern(parent, item, inc) {
    const div = this.makePattern();
    const elem = div.children;
    elem[1].value = inc;
    elem[2].value = item.type;
    elem[3].value = item.title;
    elem[4].value = item.pattern;
    elem[5].checked = item.active;
    parent.appendChild(div);
  }

  getLocationData() {console.log('called');Spinner.on();
    const hosts = pref.data.filter(i => !i.cc || !i.city).map(i => i.hostname);
    if (!hosts[0]) { return; }

    Spinner.on();

    // Alternative bilestoad.com (also belonging to FoxyProxy) is used since getfoxyproxy.org is blocked in some locations
    fetch('https://bilestoad.com/webservices/lookup.php?' + hosts.join('&'))
    .then(response => response.json())
    .then(json => this.updateLocation(json))
    .catch(error => {
      Spinner.off();
      alert(error);
    });
  }

  updateLocation(json) {
    pref.data.forEach(item => {
      if (json[item.hostname]) {
        const {cc, city} = json[item.hostname];
        cc && (item.cc = cc);
        city && (item.city = city);
      }
    });
    Spinner.off();
  }

  filterProxy(e) {
    const str = e.target.value.toLowerCase().trim();
    if (!str) { return; }
    this.proxyFieldset.querySelectorAll('input[data-id="title"]').forEach(item => {
      const details = item.parentElement.parentElement;
      const hostname = item.nextElementSibling.nextElementSibling;
      details.classList.toggle('off', ![item, hostname].some(i => i.value.toLowerCase().includes(str)));
    });
  }

  async setWebRTC(btn) {
/*
    {
      "levelOfControl": "controllable_by_this_extension",
      "value": "default"
    }
*/
    const permission = await browser.permissions.contains({permissions: ['privacy']});
    if (!permission) { return; }

    const result = await browser.privacy.network.webRTCIPHandlingPolicy.get({});
    if (result.value !== 'default') {
      btn.dataset.i18n = 'resetWebRTC';
      btn.textContent = browser.i18n.getMessage('resetWebRTC');
    }
  }

  async toggleWebRTC() {
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/permissions/request
    // Any permissions granted are retained by the extension, even over upgrade and disable/enable cycling.
    // check if permission is granted
    let permission = await browser.permissions.contains({permissions: ['privacy']});
    if (!permission) {
      // request permission
      permission = await browser.permissions.request({permissions: ['privacy']});
      if (!permission) { return; }
    }
/*
    https://searchfox.org/mozilla-central/source/toolkit/components/extensions/parent/ext-privacy.js#148
    default
    default_public_and_private_interfaces
    default_public_interface_only
    disable_non_proxied_udp
    proxy_only (only connections using TURN on a TCP connection through a proxy are allowed) // Firefox only

    config media.peerconnection.ice.

    media.peerconnection.enabled -> false


    Chrome
    WebRTC Leak Prevent -> <option value="disable_non_proxied_udp">Disable non-proxied UDP (force proxy)</option>
    WebRTC Network Limiter -> doesnt work
*/
    const reset = this.dataset.i18n === 'resetWebRTC'
    const value = reset ? 'default' : App.chrome ? 'default_public_interface_only' : 'proxy_only';
    this.dataset.i18n = reset? 'limitWebRTC' : 'resetWebRTC';
    this.textContent = browser.i18n.getMessage(this.dataset.i18n);
    browser.privacy.network.webRTCIPHandlingPolicy.set({value});
  }

  togglePassword() {
    this.previousElementSibling.type = this.previousElementSibling.type === 'password' ? 'text' : 'password';
  }

  deleteProxies() {
    document.querySelectorAll('.proxySection details.proxy').forEach(i => i.remove()); // reset proxies display
  }
}

const options = new Options(['sync', 'proxyDNS', 'globalExcludeWildcard', 'globalExcludeRegex']);
// ----------------- /Options ------------------------------

// ----------------- Import FP Account ---------------------
class ImportAcc {

  constructor() {
    this.username = document.querySelector('.importAccount #username');
    this.password = document.querySelector('.importAccount #password');
    this.hostname = document.querySelector('.importAccount #hostname');
    this.ip = document.querySelector('.importAccount #ip');
    this.https = document.querySelector('.importAccount #https');
    this.http = document.querySelector('.importAccount #http');
    document.querySelector('.importAccount button[data-i18n="togglePW|title"]').addEventListener('click', options.togglePassword);
    document.querySelector('.importAccount button[data-i18n="import"]').addEventListener('click', () => this.process());
  }

  process() {
    // fix unchecked
    !this.hostname.checked && !this.ip.checked && (this.hostname.checked = true); // default hostname
    !this.http.checked && !this.https.checked && (this.http.checked = true); // default http

    const username = this.username.value.trim();
    const password = this.password.value.trim();
    if (!username || !password) {
      alert(browser.i18n.getMessage('userPassError'));
      return;
    }

    Spinner.on();

    // --- fetch data
    // Alternative bilestoad.com (also belonging to FoxyProxy) is used since getfoxyproxy.org is blocked in some locations
    fetch('https://bilestoad.com/webservices/get-accounts.php', {
      method: 'POST',
      body:  `username=${encodeURIComponent(username)}&password=${(encodeURIComponent(password))}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      }
    })
    .then(response => response.json())
    .then(response => {
      if (!Array.isArray(response) || !response[0] || !response[0].hostname) {
        App.notify(browser.i18n.getMessage('error'));
        Spinner.off();
        return;
      }

      response.forEach(item => {
        this.hostname.checked && this.http.checked && this.makeProxy(item, {});
        this.hostname.checked && this.https.checked && this.makeProxy(item, {https: true});

        this.ip.checked && this.http.checked && this.makeProxy(item, {ip: true});
        this.ip.checked && this.https.checked && this.makeProxy(item, {ip: true, https: true});
      });

      Spinner.off();
      options.navProxy.checked = true;                      // show Proxy tab
    })
    .catch(error => {
      App.notify(browser.i18n.getMessage('error') + '\n\n' + error.message);
      Spinner.off();
    });
  }

  makeProxy(item, {ip, https}) {
    const pxy = {
      active: true,
      title: item.hostname.split('.')[0],
      color: '',                                            // random color will be set
      type: https ? 'https' : 'http',
      hostname: ip ? item.ip : item.hostname,
      port: https ? item.ssl_port : item.port[0],
      username: item.username,
      password: item.password,
      cc: item.country_code,
      city: item.city,
      include: [],
      exclude: [],
      pac: ''
    };
    pxy.title += (ip ? '.ip' : '') + '.' + pxy.port;        // adding ip & port

    options.addProxy(pxy);
  }
}
new ImportAcc();
// ----------------- /Import FP Account --------------------

class ImportURL {
  constructor() {
    this.input = document.querySelector('.importURL input');
    document.querySelector('.importURL button').addEventListener('click', () => this.process());
  }

  process() {
    this.input.value = this.input.value.trim();
    if (!this.input.value) { return; }

    Spinner.on();

    // --- fetch data
    fetch(this.input.value)
    .then(response => response.json())
    .then(data => {
      // update pref with the saved version
      Object.keys(pref).forEach(item => data.hasOwnProperty(item) && (pref[item] = data[item]));

      options.process();                                    // set options after the pref update
      options.processProxy();                               // update page display
      Spinner.off();
      options.navProxy.checked = true;                      // show Proxy tab
    })
    .catch(error => {
      App.notify(browser.i18n.getMessage('error') + '\n\n' + error.message);
      Spinner.off();
    });
  }
}

// ----------------- Import List ---------------------------
class ImportList {

  constructor() {
    this.textarea = document.querySelector('.importList textarea');
    document.querySelector('.importList button').addEventListener('click', () => this.process());
  }

  process() {
    this.textarea.value = this.textarea.value.trim();
    if (!this.textarea.value) { return; }

    this.textarea.value.split(/\n+/).forEach(item => {
      // simple vs Extended format
      const pxy = item.includes('://') ? this.parseExtended(item) : this.parseSimple(item);
      pxy & options.addProxy(pxy);
    });
  }

  parseSimple(item) {
    const [hostname, port, username = '', password = ''] = item.split(':');
    if (!hostname || !port || !(port*1)) {
      alert(`Error: ${item}`);
      return;
    }

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

  parseExtended(item) {
      const pxy = {
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

    // https://user:passw0rd@78.205.12.1:21?color=ff00bc&title=work%20proxy
    const [scheme] = item.toLowerCase().split('://');
    let url;

    // fix type
    switch (scheme) {
      case 'proxy':
        pxy.type = 'http';
        url = 'http' + item.substring(scheme.length);
        break;

      case 'ssl':
        pxy.type = 'https';
        url = 'http' + item.substring(scheme.length);
        break;

      case 'socks5':
        pxy.type = 'socks';
        url = 'http' + item.substring(scheme.length);
        break;

      default:
        pxy.type = scheme;
        url = item;
    }

    try { url = new URL(url); }
    catch (error) {
      alert(`${error}\n\n${item}`);
      return;
    }

    // check type
    const type = url.searchParams.get('type')?.toLowerCase();
    if (type && !['http', 'https ', 'socks', 'socks4', 'pac'].includes(type)) {
      alert(browser.i18n.getMessage('proxyTypeError') + '\n\n' + item);
      return;
    }

    // new URL() missing port: http -> 80 | https -> 433
    let port = url.port;
    if (!port) {
      pxy.type === 'http' && (port = '80');
      pxy.type === 'https' && (port = '443');
    }

    // check port
    if (type !== 'pac' && !port) {
      alert(browser.i18n.getMessage('proxyPortError') + '\n\n' + item);
      return;
    }

    url.username && (pxy.username = decodeURIComponent(url.username));
    url.password && (pxy.password = decodeURIComponent(url.password));

    url.searchParams.forEach((value, key) => {
      key = key.toLowerCase();
      switch (key) {
        case 'active':
          pxy.active = value === 'true';
          break;

        case 'color':
          pxy.color = '#' + value;
          break;

        case 'countrycode':
          pxy.cc = value;
          break;

        default:
          !['include', 'exclude'].includes(key) && pxy.hasOwnProperty(key) && (pxy[key] = value);
      }
    });

    pxy.port = port;
    pxy.hostname = url.hostname;
    pxy.cc = pxy.cc.toUpperCase();                          // fix case issue
    type === 'pac' && (pxy.pac = url.origin + url.pathname);
    return pxy;
  }
}
new ImportList();
// ----------------- /Import List --------------------------

// ----------------- Import Older Export -------------------
class ImportOlder {

  constructor() {
    document.querySelector('.importOlder input').addEventListener('change', e => this.process(e));
  }

  process(e) {
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

  parseJSON(data) {
    try { data = JSON.parse(data); }
    catch(e) {
      App.notify(browser.i18n.getMessage('fileParseError')); // display the error
      return;
    }

    pref = Migrate.convert7(data);
  }
}
new ImportOlder();

// ----------------- /Import Older Export ------------------

// ----------------- Tester --------------------------------
class Tester {

  constructor() {
    this.url = document.querySelector('.tester input[type="url"]');
    this.select = document.querySelector('.tester select');
    this.pattern = document.querySelector('.tester input[type="text"]');
    this.result = document.querySelector('.tester .testResult');
    document.querySelector('.tester button').addEventListener('click', () => this.process());
  }

  process() {
    this.result.textContent = '';                           // reset
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
      this.result.textContent = error;
      return;
    }

    this.result.textContent = regex.test(this.url.value) ? '✅' : '❌';
  }
}
const tester = new Tester();
// ----------------- /Tester -------------------------------

// ----------------- Log -----------------------------------
class ShowLog {

  // no proxy info on chrome
 /*
{
  "documentLifecycle": "active",
  "frameId": 0,
  "frameType": "outermost_frame",
  "initiator": "https://www.google.com",
  "method": "GET",
  "parentFrameId": -1,
  "requestId": "288",
  "tabId": 1767457250,
  "timeStamp": 1663995940557.429,
  "type": "main_frame",
  "url": "https://www.google.com/search?q=my+ip&oq=&aqs=chrome.0.69i59i450l8.636329j0j15&client=ubuntu&sourceid=chrome&ie=UTF-8"
}

{
  "requestId": "25484",
  "url": "https://greasyfork.org/scripts/4294-antiadware/code/AntiAdware.user.js",
  "originUrl": "https://greasyfork.org/de/scripts/4294-antiadware",
  "method": "GET",
  "type": "main_frame",
  "timeStamp": 1573050075868,
  "frameId": 0,
  "parentFrameId": -1,
  "thirdParty": false,
  "proxyInfo": {
    "connectionIsolationKey": "",
    "failoverTimeout": 5,
    "hostname": "209.208.63.172",
    "port": 4443,
    "proxyAuthorizationHeader": "",
    "proxyDNS": false,
    "type": "https",
    "username": ""
  },
  "ip": null,
  "frameAncestors": [],
  "urlClassification": {
    "firstParty": [],
    "thirdParty": []
  },
  "requestSize": 0,
  "responseSize": 0,
  "tabId": 237,
  "incognito": false
}
 */
  constructor() {
    this.trTemplate = document.querySelector('.log template').content.firstElementChild;
    this.tbody = document.querySelector('.log tbody');

    App.chrome ? this.notAvailable() : browser.webRequest.onBeforeRequest.addListener(e => this.process(e), {urls: ['*://*/*']});
  }

  notAvailable() {
    const tr = this.trTemplate.cloneNode(true);
    [...tr.children].forEach((item, index) => index > 0 && item.remove());
    const td = tr.children[0];
    td.colSpan = '5';
    td.classList.add('unavailable');
    this.tbody.appendChild(tr);
  }

  process(e) {
    if (!e?.proxyInfo) { return; }

    const tr = this.tbody.children[99] || this.trTemplate.cloneNode(true);
    const td = tr.children;

    td[0].title = e.documentUrl || '';
    td[0].textContent = e.documentUrl || '';
    td[1].title = e.url;
    td[1].textContent = e.url;
    td[2].textContent = e.method;
    td[3].children[0].textContent = e.proxyInfo.hostname;
    td[3].children[1].textContent = `:${e.proxyInfo.port}`;
    td[4].textContent = this.formatInt(e.timeStamp);

    this.tbody.prepend(tr);                                 // in reverse order, new on top
  }

  formatInt(d) {
    return new Intl.DateTimeFormat(navigator.language,
              {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false}).format(new Date(d));
  }
}
const showLog = new ShowLog();
// ---------------- /Log -----------------------------------

// ----------------- Navigation ----------------------------
class Nav {

  constructor() {
    this.navHelp = document.getElementById('nav1');
    this.help = document.querySelector('iframe[src="help.html"]').contentWindow.document;
    window.addEventListener('hashchange', this.process);
    this.process();                                         // check on load
  }

  process() {
    location.search === '?help' && (this.navHelp.checked = true); // show Help tab
    location.hash && (this.help.location.hash = location.hash);
  }
}
new Nav();
// ----------------- /Navigation ---------------------------

// ----------------- Import/Export Preferences -------------
ImportExport.init(() => {
  options.process();                                        // set options after the pref update
  options.deleteProxies();
  options.processProxy();                                   // update page display
});
// ----------------- /Import/Export Preferences ------------

// ----------------- User Preference -----------------------
App.getPref().then(() => {
  options.process();
  options.processProxy();
  showLog.process();
});
// ----------------- /User Preference ----------------------
