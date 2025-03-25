export class Popup {

  static popup = document.querySelector('.popup');

  static {
    [this.close, this.textarea, this.select] = this.popup.children;
    this.close.addEventListener('click', () => this.hide());
  }

  static show(text, showSelect) {
    this.select.style.display = showSelect ? 'unset' : 'none';
    this.textarea.value += text;
    this.popup.classList.add('on');
  }

  static hide() {
    this.popup.classList.remove('on');
    this.textarea.value = '';
    this.select.selectedIndex = 0;
  }
}