import {pref, App} from './app.js';
import {Proxies} from './options-proxies.js';
import {ImportExport} from './import-export.js';
import {ImportUrl} from './import-url.js';
import {ImportOlder} from './import-older.js';
import {Flag} from './flag.js';
import {ProgressBar} from './progress-bar.js';
import {Nav} from './nav.js';
import './get-location.js';
import './incognito-access.js';
import './browsing-data.js';
import './webrtc.js';
import './options-filter.js';
import './bulk-edit.js';
import './drag-drop.js';
import './ping.js';
import './test.js';
import './import-account.js';
import './import-list.js';
import './show.js';
import './i18n.js';
import './theme.js';

// ---------- User Preferences -----------------------------
await App.getPref();

// ---------- Options --------------------------------------
class Options {

  static {
    // --- keyboard Shortcut
    this.commands = document.querySelectorAll('.options .commands select');

    // --- global passthrough
    this.passthrough = document.getElementById('passthrough');

    // --- buttons
    document.querySelector('.options button[data-i18n="restoreDefaults"]').addEventListener('click', () => this.restoreDefaults());

    this.init(['sync', 'autoBackup', 'theme', 'showPatternProxy', 'passthrough']);
  }

  static init(keys = Object.keys(pref)) {
     // defaults to pref keys
    this.prefNode = document.querySelectorAll('#' + keys.join(',#'));
    // submit button
    document.querySelectorAll('button[type="submit"]').forEach(i => i.addEventListener('click', () => this.check()));

    this.process();
  }

  static process(save) {
    // 'save' is only set when clicking the button to save options
    this.prefNode.forEach(node => {
      // value: 'select-one', 'textarea', 'text', 'number'
      const attr = node.type === 'checkbox' ? 'checked' : 'value';
      save ? pref[node.id] = node[attr] : node[attr] = pref[node.id];
    });

    // update saved pref
    save && !ProgressBar.show() && browser.storage.local.set(pref);
    this.fillContainerCommands(save);
  }

  static async check() {
    // not for storage.managed
    if (pref.managed) { return; }

    // --- global exclude, clean up, remove path, remove duplicates
    const passthrough = this.passthrough.value.trim();
    const [separator] = passthrough.match(/[\s,;]+/) || ['\n'];
    const arr = passthrough.split(/[\s,;]+/).filter(Boolean)
      .map(i => /[\d.]+\/\d+/.test(i) ? i : i.replace(/(?<=[a-z\d])\/[^\s,;]*/gi, ''));
    this.passthrough.value = [...new Set(arr)].join(separator);
    pref.passthrough = this.passthrough.value;

    // --- check and build proxies & patterns
    const data = [];
    const cache = {};
    // using for loop to be able to break early
    for (const item of document.querySelectorAll('div.proxy-div details')) {
      const pxy = await Proxies.getProxyDetails(item);
      if (!pxy) { return; }

      data.push(pxy);

      // cache to update Proxies cache
      const id = pxy.type === 'pac' ? pxy.pac : `${pxy.hostname}:${pxy.port}`;
      cache[id] = pxy;
    }

    // no errors, update pref.data
    pref.data = data;

    // helper: remove if proxy is deleted or disabled
    const checkSelect = i => i.value && !cache[i.value]?.active && (i.value = '');

    // --- container proxy
    const containerList = document.querySelectorAll('.options .container select');
    const container = {};
    containerList.forEach(i => {
      checkSelect(i);
      i.value && (container[i.name] = i.value);
    });
    // set to pref
    pref.container = container;

    // --- keyboard shortcut proxy
    const commands = {};
    this.commands.forEach(i => {
      checkSelect(i);
      commands[i.name] = i.value;
    });
    // set to pref
    pref.commands = commands;

    // --- check mode
    // get from storage in case it was changed while options page has been open
    let {mode} = await browser.storage.local.get({mode: 'disable'});
    switch (true) {
      case pref.mode.includes('://') && !/:\d+$/.test(pref.mode) && !pref.data.some(i => i.active && i.type === 'pac' && mode === i.pac):
      case pref.mode.includes(':') && !pref.data.some(i => i.active && i.type !== 'pac' && mode === `${i.hostname}:${i.port}`):
      case pref.mode === 'pattern' && !pref.data.some(i => i.active && i.include[0]):
        mode = 'disable';
        break;
    }
    pref.mode = mode;

    // --- save options
    this.process(true);

    // --- update Proxy
    // check 'prefers-color-scheme' since it is not available in background service worker
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    browser.runtime.sendMessage({id: 'setProxy', pref, dark});

    // --- Auto Backup
    pref.autoBackup && ImportExport.export(pref, false, `${browser.i18n.getMessage('extensionName')}/`);

    // --- Sync
    this.sync(pref);
  }

  // https://github.com/w3c/webextensions/issues/510
  // Proposal: Increase maximum item size in Storage sync quotas
  static sync(pref) {
    if (!pref.sync) { return; }

    // convert array to object {...data} to avoid sync maximum item size limit
    const obj = {...pref.data};

    // add other sync properties
    App.syncProperties.forEach(i => obj[i] = pref[i]);

    // save changes to sync
    browser.storage.sync.set(obj)
    .then(() => {
      // delete left-over proxies
      browser.storage.sync.get()
      .then(syncObj => {
        // get & delete numerical keys that are equal or larger than data length, the rest are overwritten
        const del = Object.keys(syncObj).filter(i => /^\d+$/.test(i) && i * 1 >= pref.data.length);
        del[0] && browser.storage.sync.remove(del);
      });
    })
    .catch(error => {
      App.notify(browser.i18n.getMessage('syncError') + '\n\n' + error.message);
      // disabling sync option to avoid repeated errors
      document.getElementById('sync').checked = false;
      browser.storage.local.set({sync: false});
    });
  }

  static restoreDefaults() {
    if (!confirm(browser.i18n.getMessage('restoreDefaultsConfirm'))) { return; }

    const db = App.getDefaultPref();
    Object.keys(db).forEach(i => pref[i] = db[i]);
    this.process();
    Proxies.process();
  }

  static makeProxyOption() {
    // create proxy option
    const docFrag = document.createDocumentFragment();
    // filter out PAC, limit to 50
    pref.data.filter(i => i.active && i.type !== 'pac').slice(0, 50).forEach(i => {
      const flag = Flag.get(i.cc);
      const value = `${i.hostname}:${i.port}`;
      const opt = new Option(flag + ' ' + (i.title || value), value);
      // supported on Chrome, not on Firefox
      // opt.style.color = item.color;

      docFrag.append(opt.cloneNode(true));
    });

    return docFrag;
  }

  // --- container & commands
  static fillContainerCommands(save) {
    // create proxy option
    const docFrag = this.makeProxyOption();

    // not when clicking save
    if (!save) {
      this.addCustomContainer();

      // populate the template select
      this.containerSelect.append(docFrag.cloneNode(true));

      // add custom containers, sort by number
      const list = [...document.querySelectorAll('.options .container select')].map(i => i.name);
      Object.keys(pref.container).filter(i => !list.includes(i)).sort()
        .forEach(i => this.addContainer(i.substring(10)));
    }

    const containerList = document.querySelectorAll('.options .container select');

    // reset
    this.clearSelect(containerList);
    this.clearSelect(this.commands);

    containerList.forEach(i => {
      i.append(docFrag.cloneNode(true));
      pref.container[i.name] && (i.value = pref.container[i.name]);
    });

    this.commands.forEach(i => {
      i.append(docFrag.cloneNode(true));
      pref.commands[i.name] && (i.value = pref.commands[i.name]);
    });

    // help fill log select elements
    document.querySelectorAll('.popup select:not(.popup-server)').forEach(i => i.append(docFrag.cloneNode(true)));
  }

  static clearSelect(elem) {
    // remove children except the first one
    elem.forEach(i => i.replaceChildren(i.firstElementChild));
  }

  static addCustomContainer() {
    // using generic names
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1386673
    // Make Contextual Identity extensions be an optional permission
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1947602
    // Allow limited read-only access to contextualIdentities.query without permission

    [this.containerLabel, this.containerSelect] =
      document.querySelector('.options .container template').content.children;

    this.containerButton = document.querySelector('.options .container button');
    this.containerButton.addEventListener('click', () => this.addContainer(prompt(browser.i18n.getMessage('addContainerPrompt'))));
  }

  static addContainer(n) {
    n *= 1;
    if (!n || this.hasContainer(n)) { return; }

    const label = this.containerLabel.cloneNode(true);
    const select = this.containerSelect.cloneNode(true);

    label.append(n);
    select.name = `container-${n}`;
    this.containerButton.before(label, select);
  }

  static hasContainer(n) {
    return document.querySelector(`.options .container select[name="container-${n}"]`);
  }
}
// ---------- /Options -------------------------------------

// ---------- Proxies --------------------------------------
Proxies.process(pref);

// ---------- Import From URL ------------------------------
ImportUrl.init(pref, () => {
  // set options after the pref update, update page display, show Proxy tab
  Options.process();
  Proxies.process(pref);
  Nav.get('proxies');
});

// ---------- Import Older Preferences ---------------------
ImportOlder.init(pref, () => {
  // set options after the pref update, update page display, show Proxy tab
  Options.process();
  Proxies.process(pref);
  Nav.get('proxies');
});

// ---------- Import/Export Preferences --------------------
ImportExport.init(pref, () => {
  // set options after the pref update, update page display
  Options.process();
  Proxies.process(pref);
});

// ---------- Navigation -----------------------------------
Nav.get();