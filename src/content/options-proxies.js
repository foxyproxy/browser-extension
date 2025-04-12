import {App} from './app.js';
import {ImportExport} from './import-export.js';
import {Pattern} from './pattern.js';
import {Flag} from './flag.js';
import {Color} from './color.js';
import {PAC} from './pac.js';
import {Toggle} from './toggle.js';
import {Tester} from './tester.js';
import {Log} from './log.js';
import {Nav} from './nav.js';

export class Proxies {

  static {
    this.proxyDiv = document.querySelector('div.proxy-div');
    [this.proxyTemplate, this.patternTemplate] =
      document.querySelector('.proxy-section template').content.children;

    // firefox only, disabling Tab Proxy in the template for chrome
    !App.firefox && (this.patternTemplate.children[1].lastElementChild.disabled = true);

    // --- buttons
    document.querySelector('.proxy-top button[data-i18n="add"]').addEventListener('click', e => {
      // this.addProxy(null, e.ctrlKey)
      const [pxy, title] = this.addProxy();
      e.ctrlKey ? this.proxyDiv.prepend(pxy) : this.proxyDiv.append(pxy);
      pxy.open = true;
      pxy.draggable = false;
      title.focus();
    });

    // used to find proxy
    this.proxyCache = {};
    // used to get the details for the log
    Log.proxyCache = this.proxyCache;
    // this.process();

    // import pattern from log.js
    window.addEventListener('importPatternCustom', (e) => this.importPatternCustom(e));
  }

  // pref references the same object in the memory and its value gets updated
  static process(pref) {
    Log.mode = pref.mode;
    // reset
    this.proxyDiv.textContent = '';
    const docFrag = document.createDocumentFragment();
    pref.data.forEach(i => docFrag.append(this.addProxy(i)));
    this.proxyDiv.append(docFrag);
  }

  static addProxy(item, modifier) {
    // --- details: make a blank proxy with all event listeners
    const pxy = this.proxyTemplate.cloneNode(true);
    const summary = pxy.children[0];
    const proxyBox = pxy.children[1].children[0];
    const patternBox = pxy.children[1].children[2];

    // disable draggable when details is open
    summary.addEventListener('click', () => pxy.draggable = pxy.open);

    // --- summary
    const [flag, sumTitle, active, dup, del, up, down] = summary.children;
    dup.addEventListener('click', () => this.duplicateProxy(pxy));
    del.addEventListener('click', () => confirm(browser.i18n.getMessage('deleteConfirm')) && pxy.remove());
    up.addEventListener('click', () => pxy.previousElementSibling?.before(pxy));
    down.addEventListener('click', () => pxy.nextElementSibling?.after(pxy));

    // proxy data
    const [title, hostname, type, port, cc, username, city, passwordSpan,
      colorSpan, pacSpan, proxyDNS] = [...proxyBox.children].filter((e, i) => i % 2);
    title.addEventListener('change', e => sumTitle.textContent = e.target.value);

    const [pac, storeLocallyLabel, view] = pacSpan.children;

    type.addEventListener('change', e => {
      // use for show/hide elements
      pxy.dataset.type = e.target.value;

      const elem = e.target.selectedOptions[0];
      const data = elem.dataset;
      // --- server auto-fill helpers
      switch (true) {
        case ['flag', 'hostname', 'port'].some(i => data[i]):
          sumTitle.textContent = elem.textContent;
          title.value = elem.textContent;
          data.flag && (flag.textContent = data.flag);
          data.hostname && (hostname.value = data.hostname);
          data.port && (port.value = data.port);
          break;

        default:
          flag.textContent = Flag.get(cc.value);
        }
    });

    cc.addEventListener('change', () => flag.textContent = Flag.get(cc.value));
    Toggle.password(passwordSpan.children[1]);

    // random color
    const color = item?.color || Color.getRandom();
    summary.style.borderLeftColor = color;
    const [colorInput, colorButton] = colorSpan.children;
    colorInput.value = color;
    colorInput.addEventListener('change', e => summary.style.borderLeftColor = e.target.value);

    colorButton.addEventListener('click', e => {
      e.target.previousElementSibling.value = Color.getRandom();
      summary.style.borderLeftColor = e.target.previousElementSibling.value;
    });

    pac.addEventListener('change', e => {
      const {hostname: h, port: p} = App.parseURL(e.target.value);
      if (!h) {
        e.target.classList.add('invalid');
        return;
      }
      hostname.value = h;
      port.value = p;
      type.value = 'pac';
      title.value ||= 'PAC';
      sumTitle.textContent ||= 'PAC';
    });

    // ---patterns
    pxy.querySelector('button[data-i18n="add|title"]').addEventListener('click', e => {
      const elem = this.addPattern();
      e.ctrlKey ? patternBox.prepend(elem) : patternBox.append(elem);
      elem.children[4].focus();
    });
    pxy.querySelector('input[type="file"]').addEventListener('change', e => this.importPattern(e, patternBox));
    pxy.querySelector('button[data-i18n^="export"]').addEventListener('click', () =>
      this.exportPattern(patternBox, title.value.trim() || hostname.value.trim()));

    // --- from add button
    if (!item) {
      return [pxy, title];
    }

    // show/hide elements
    pxy.dataset.type = item.type;

    const id = item.type === 'pac' ? item.pac : `${item.hostname}:${item.port}`;
    // cache to find later
    this.proxyCache[id] = item;

    // --- populate with data
    const pxyTitle = item.title || id;

    // --- summary
    flag.textContent = Flag.show(item);
    sumTitle.textContent = pxyTitle;
    active.checked = item.active;

    // proxy details
    title.value = item.title;
    hostname.value = item.hostname;
    type.value = item.type;
    port.value = item.port;
    cc.value = item.cc;
    // used in "Get Location"
    cc.dataset.hostname = item.hostname;
    username.value = item.username;
    city.value = item.city;
    // used in "Get Location"
    city.dataset.hostname = item.hostname;
    passwordSpan.children[0].value = item.password;

    pac.value = item.pac;
    storeLocallyLabel.children[0].checked = !!item.pacString;
    view.addEventListener('click', () => PAC.view(pac.value.trim()));

    proxyDNS.checked = item.proxyDNS;

    // --- patterns
    patternBox.dataset.host = `${item.hostname}:${item.port}`;
    item.tabProxy ||= [];
    item.include.forEach(i => patternBox.append(this.addPattern(i, 'include')));
    item.exclude.forEach(i => patternBox.append(this.addPattern(i, 'exclude')));
    item.tabProxy.forEach(i => patternBox.append(this.addPattern(i, 'tabProxy')));
    return pxy;
  }

  static addPattern(item, inc) {
    // --- make a blank pattern with all event listeners
    const div = this.patternTemplate.cloneNode(true);
    const [quickAdd, include, type, title, pattern, active, test, del] = div.children;

    quickAdd.addEventListener('change', e => {
      const opt = e.target.selectedOptions[0];
      type.value = opt.dataset.type;
      title.value = opt.textContent;
      pattern.value = opt.value;
      // reset select option
      e.target.selectedIndex = 0;
    });

    test.addEventListener('click', () => {
      Tester.select.value = type.value;
      Tester.pattern.value = pattern.value;
      Tester.target = pattern;
      // reset pre DOM
      Tester.pre.textContent = Tester.pre.textContent.trim();
       // navigate to Tester tab
      Nav.get('tester');
    });

    // del.addEventListener('click', () => confirm(browser.i18n.getMessage('deleteConfirm')) && div.remove());
    del.addEventListener('click', () => div.remove());

    if (item) {
      include.value = inc;
      type.value = item.type;
      title.value = item.title;
      pattern.value = item.pattern;
      active.checked = item.active;
    }

    return div;
  }

  static async duplicateProxy(item) {
    // generating a new proxy as cloneNode() removes event listeners
    const pxy = await this.getProxyDetails(item);
    if (!pxy) { return; }

    item.after(this.addProxy(pxy));
    // close orig proxy
    item.open = false;
    // open duplicated proxy
    item.nextElementSibling.open = true;
  }

  // import pattern from log.js
  static importPatternCustom(e) {
    const {host, data} = e.detail;
    if (!host || !data) { return; }

    const patternBox = document.querySelector(`.pattern-box[data-host="${host}"]`);
    if (!patternBox) { return; }

    data.forEach(i => patternBox.append(this.addPattern(i, i.include)));
    patternBox.closest('details').open = true;
    patternBox.lastElementChild.children[4].focus();
  }

  static importPattern(e, patternBox) {
    const file = e.target.files[0];
    switch (true) {
      case !file: App.notify(browser.i18n.getMessage('error'));
        return;
      // check file MIME type
      case !['text/plain', 'application/json'].includes(file.type):
        App.notify(browser.i18n.getMessage('fileTypeError'));
        return;
    }

    ImportExport.fileReader(file, data => {
      try { data = JSON.parse(data); }
      catch {
        // display the error
        App.notify(browser.i18n.getMessage('fileParseError'));
        return;
      }

      Array.isArray(data) && data.forEach(i => patternBox.append(this.addPattern(i, i.include)));
    });
  }

  static exportPattern(patternBox, title = '') {
    const arr = [...patternBox.children].map(item => {
      const elem = item.children;
      return {
        include: elem[1].value,
        type: elem[2].value,
        title: elem[3].value.trim(),
        pattern: elem[4].value.trim(),
        active: elem[5].checked,
      };
    });

    // no patterns to export
    if (!arr[0]) { return; }

    title &&= '_' + title;
    const data = JSON.stringify(arr, null, 2);
    const filename = `${browser.i18n.getMessage('pattern')}${title}_${new Date().toISOString().substring(0, 10)}.json`;
    ImportExport.saveFile({data, filename, type: 'application/json'});
  }

  static async getProxyDetails(elem) {
    // proxy template
    const obj = {
      active: true,
      title: '',
      type: 'http',
      hostname: '',
      port: '',
      username: '',
      password: '',
      cc: '',
      city: '',
      color: '',
      pac: '',
      pacString: '',
      proxyDNS: true,
      include: [],
      exclude: [],
      tabProxy: [],
    };

    // --- populate values
    elem.querySelectorAll('[data-id]').forEach(i => {
      // reset
      i.classList.remove('invalid');
      Object.hasOwn(obj, i.dataset.id) && (obj[i.dataset.id] = i.type === 'checkbox' ? i.checked : i.value.trim());
    });

    // --- check type: http | https | socks4 | socks5 | quic | pac | direct
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

      // http | https | socks4 | socks5 | quic
      case !obj.hostname:
        this.setInvalid(elem, 'hostname');
        alert(browser.i18n.getMessage('hostnamePortError'));
        return;

      case !obj.port:
        this.setInvalid(elem, 'port');
        alert(browser.i18n.getMessage('hostnamePortError'));
        return;
    }

    // --- title check
    if (!obj.title) {
      const id = obj.type === 'pac' ? obj.pac : `${obj.hostname}:${obj.port}`;
      elem.children[0].children[1].textContent = id;
    }

    // --- check store locally for active PAC
    if (obj.active && obj.pac) {
      const storeLocally = elem.querySelector('.pac input[type="checkbox"]');
      if (storeLocally.checked) {
        const str = await PAC.get(obj.pac);
        /function\s+FindProxyForURL\s*\(/.test(str) && (obj.pacString = str.trim());
      }
    }

    // --- check & build patterns
    const cache = [];
    for (const item of elem.querySelectorAll('.pattern-box .pattern-row')) {
      const [, inc, type, title, pattern, active] = item.children;
      // reset
      pattern.classList.remove('invalid');
      const pat = {
        type: type.value,
        title: title.value.trim(),
        pattern: pattern.value.trim(),
        active: active.checked,
      };

      // --- test pattern
      // blank pattern
      if (!pat.pattern) { continue; }

      if (!Pattern.validate(pat.pattern, pat.type, true)) {
        // show Proxy tab
        Nav.get('proxies');
        const details = item.closest('details');
        // open proxy
        details.open = true;
        pattern.classList.add('invalid');
        pattern.scrollIntoView({behavior: 'smooth'});
        return;
      }

      // check for duplicate
      if (cache.includes(pat.pattern)) {
        item.remove();
        continue;
      }

      // cache to check for duplicates
      cache.push(pat.pattern);
      obj[inc.value].push(pat);
    }

    return obj;
  }

  static setInvalid(parent, id) {
    parent.open = true;
    const elem = parent.querySelector(`[data-id="${id}"]`);
    elem.classList.add('invalid');
    parent.scrollIntoView({behavior: 'smooth'});
  }
}