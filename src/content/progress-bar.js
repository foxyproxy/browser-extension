// ---------- progress bar ---------------------------------
export class ProgressBar {

  static bar = document.querySelector('.progress-bar');

  static show() {
    this.bar.classList.add('on');
    setTimeout(() => this.bar.classList.remove('on'), 2000);
  }
}