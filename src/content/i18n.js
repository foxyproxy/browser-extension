// ---------- internationalization (side effect) -----------
class I18n {

  static {
    document.querySelectorAll('template').forEach(i => this.set(i.content));
    this.set();
    // show after
    // document.body.style.opacity = 1;
  }

  static set(target = document) {
    target.querySelectorAll('[data-i18n]').forEach(i => {
      let [text, attr] = i.dataset.i18n.split('|');
      text = browser.i18n.getMessage(text);
      attr ? i.setAttribute(attr, text) : i.append(text);
    });
  }
}