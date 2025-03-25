import {App} from './app.js';

// ---------- Show (Side Effect) ---------------------------
class Show {

  static {
    const {basic, firefox} = App;
    basic && document.body.classList.add('basic');
    !firefox && document.body.classList.add('chrome');

    const elem = document.querySelector('img[src="../image/icon.svg"]');
    elem?.addEventListener('click', () => {
      basic && document.body.classList.toggle('basic');
      !firefox && document.body.classList.toggle('chrome');
    });
  }
}