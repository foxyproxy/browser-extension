// ---------- Theme (Side Effect) --------------------------
class Theme {

  static {
    this.elem = [document, ...[...document.querySelectorAll('iframe')].map(i => i.contentDocument)];
    document.getElementById('theme').addEventListener('change', e => this.set(e.target.value));

    browser.storage.local.get('theme').then(i => {
      i.theme && this.set(i.theme);
      // show after
      document.body.style.opacity = 1;
    });
  }

  static set(value) {
    this.elem.forEach(i => i.documentElement.className = value);
  }
}