import {App} from './app.js';

// ---------- show (side effect) ---------------------------
class Show {

  static {
    const {basic, firefox} = App;
    basic && document.body.classList.add('basic');
    !firefox && document.body.classList.add('chrome');

    document.querySelector('img[src="../image/icon.svg"]')?.addEventListener('click', () => {
      basic && document.body.classList.toggle('basic');
      !firefox && document.body.classList.toggle('chrome');
    });
  }
}