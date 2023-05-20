// ---------- Progress Bar ---------------------------------
export class ProgressBar {

  static #bar = document.querySelector('.progressBar');

  static show() {
    this.#bar.classList.toggle('on');
    setTimeout(() => this.#bar.classList.toggle('on'), 2000);
  }
}