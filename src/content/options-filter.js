// ---------- Filter Proxy (Side Effect) -------------------
class Filter {

  static {
    this.list = document.querySelector('div.proxy-div');
    const filter = document.querySelector('.filter');
    filter.addEventListener('input', e => this.process(e));
  }

  static process(e) {
    const str = e.target.value.toLowerCase().trim();
    const elem = [...this.list.children];
    if (!str) {
      elem.forEach(i => i.classList.remove('off'));
      return;
    }

    elem.forEach(item => {
      const proxyBox = item.children[1].children[0];
      const title = proxyBox.children[1].value;
      const hostname = proxyBox.children[3].value;
      const port = ':' + proxyBox.children[7].value;
      item.classList.toggle('off', ![title, hostname, port].some(i => i.toLowerCase().includes(str)));
    });
  }
}