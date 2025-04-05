// ---------- Internationalization (Side Effect) -----------
class I18n {

  static {
    document.querySelectorAll('template').forEach(i => this.set(i.content));
    this.set();
    // show after
    // document.body.style.opacity = 1;
  }

  static set(target = document) {
    target.querySelectorAll('[data-i18n]').forEach(elem => {
      let [text, attr] = elem.dataset.i18n.split('|');
      text = browser.i18n.getMessage(text);
      attr ? elem.setAttribute(attr, text) : elem.append(text);
    });
  }
}