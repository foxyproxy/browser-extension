// ---------- Internationalization (Side Effect) -----------
class I18n {

  static {
    document.querySelectorAll('template').forEach(item => this.set(item.content));
    this.set();
    document.body.style.opacity = 1;                        // show after i18n
  }

  static set(target = document) {
    target.querySelectorAll('[data-i18n]').forEach(node => {
      let [text, attr] = node.dataset.i18n.split('|');
      text = browser.i18n.getMessage(text);
      attr ? node.setAttribute(attr, text) : node.append(text);
    });
  }
}