export class Popup {

  static {
    this.popup = document.querySelector('.popup');
    [this.close, this.textarea] = this.popup.children;
    this.close.addEventListener('click', () => this.hide());
  }

  static show(text) {
    this.textarea.value += text + '\n';
    this.popup.classList.add('on');
  }

  static hide() {
    this.popup.classList.remove('on');
    this.textarea.value = '';
    [...this.popup.children].forEach(i => {
      if (i.nodeName === 'SELECT') {
        i.selectedIndex = 0;
        i.classList.remove('on');
      }
    });
  }
}