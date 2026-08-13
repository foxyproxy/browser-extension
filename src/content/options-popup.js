export class Popup {

  static {
    this.popup = document.querySelector('.popup');
    [this.close, this.textarea] = this.popup.children;
    this.close.addEventListener('click', () => this.hide());

    this.popup.addEventListener('cancel', () => {
      this.textarea.value = '';
    });
  }

  static show(text) {
    text && (this.textarea.value += text + '\n');
    this.popup.showModal();
  }

  static hide() {
    this.popup.close();
    this.textarea.value = '';
    [...this.popup.children].forEach(i => {
      if (i.nodeName === 'SELECT') {
        i.selectedIndex = 0;
        i.classList.remove('on');
      }
    });
  }
}