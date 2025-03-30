import {App} from './app.js';
import {Spinner} from './spinner.js';

// ---------- Import from URL ------------------------------
export class ImportUrl {

  static {
    this.input = document.querySelector('.import-from-url input');
  }

  // pref references the same object in the memory and its value gets updated
  static init(pref, callback) {
    this.callback = callback;
    document.querySelector('.import-from-url button').addEventListener('click', () => this.process(pref));
  }

  static process(pref) {
    this.input.value = this.input.value.trim();
    if (!this.input.value) { return; }

    Spinner.show();

    // --- fetch data
    fetch(this.input.value)
    .then(response => response.json())
    .then(data => {
      // update pref with the saved version
      Object.keys(pref).forEach(i => Object.hasOwn(data, i) && (pref[i] = data[i]));

      this.callback();
      Spinner.hide();
    })
    .catch(error => {
      App.notify(browser.i18n.getMessage('error') + '\n\n' + error.message);
      Spinner.hide();
    });
  }
}