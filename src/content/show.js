import {App} from './app.js';

// ---------- Show (Side Effect) -----------
class Show {

  static basic = browser.runtime.getManifest().name === browser.i18n.getMessage('extensionNameBasic');

  static {
    const elem = document.querySelector('img[src="../image/icon.svg"]');
    elem?.addEventListener('click', () => this.added ? this.remove() : this.add());
    this.add();
  }

  // --- hide elements for Basic & Chrome
  static add() {
    this.added = true;
    this.basic && document.body.classList.add('basic');
    !App.firefox && document.body.classList.add('chrome');
  }

  // --- show elements
  static remove() {
    this.added = false;
    document.body.classList.remove('basic', 'chrome');
  }
}