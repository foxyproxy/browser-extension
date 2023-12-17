import {App} from './app.js';

// ---------- Show (Side Effect) -----------
// eslint-disable-next-line no-unused-vars
class Show {

  static {
    // --- hide elements for Basic
    this.showJS = document.querySelector('.show-js');
    this.add();

    const elem = document.querySelector('img[src="../image/icon.svg"]');
    elem?.addEventListener('click', () => this.added ? this.remove() : this.add());
  }

  static add() {
    this.added = true;
    App.basic && this.showJS?.classList.add('basic');
    !App.firefox && this.showJS?.classList.add('chrome');
  }

  static remove() {
    this.added = false;
    this.showJS?.classList.remove('basic', 'chrome');
  }
}