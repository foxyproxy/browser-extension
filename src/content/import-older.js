import {App} from './app.js';
import {Migrate} from './migrate.js';

// ---------- Import Older Preferences ---------------------
export class ImportOlder {

  // pref references the same object in the memory and its value gets updated
  static init(pref, callback) {
    this.callback = callback;
    document.querySelector('.import-from-older input').addEventListener('change', e => this.process(e, pref));
  }

  static process(e, pref) {
    const file = e.target.files[0];
    switch (true) {
      case !file: App.notify(browser.i18n.getMessage('error')); return;
      // check file MIME type
      case !['text/plain', 'application/json'].includes(file.type):
        App.notify(browser.i18n.getMessage('fileTypeError'));
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => this.parseJSON(reader.result, pref);
    reader.onerror = () => App.notify(browser.i18n.getMessage('fileReadError'));
    reader.readAsText(file);
  }

  static parseJSON(data, pref) {
    try { data = JSON.parse(data); }
    catch {
      // display the error
      App.notify(browser.i18n.getMessage('fileParseError'));
      return;
    }

    data = Object.hasOwn(data, 'settings') ? Migrate.convert3(data) : Migrate.convert7(data);
    // update pref with the saved version
    Object.keys(pref).forEach(i => Object.hasOwn(data, i) && (pref[i] = data[i]));

    this.callback();
  }
}