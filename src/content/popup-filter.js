// ---------- filter proxy (side effect) -------------------
class Filter {

  static {
    this.list = document.querySelector('div.list');
    const filter = document.querySelector('.filter');
    filter.addEventListener('input', e => this.filterProxy(e));
  }

  static filterProxy(e) {
    const str = e.target.value.toLowerCase().trim();
    // not the first 2
    const elem = [...this.list.children].slice(2);
    if (!str) {
      elem.forEach(i => i.classList.remove('off'));
      return;
    }

    elem.forEach(item => {
      const title = item.children[1].textContent;
      // input radio
      const host = item.children[4].value;
      item.classList.toggle('off', ![title, host].some(i => i.toLowerCase().includes(str)));
    });
  }
}