// ---------- filter proxy (side effect) -------------------
class Filter {

  static {
    this.list = document.querySelector('div.proxy-div');
    document.querySelector('.filter').addEventListener('input', e => this.process(e));
  }

  static process(e) {
    const str = e.target.value.toLowerCase().trim();
    // <details>
    const elem = [...this.list.children];
    if (!str) {
      elem.forEach(i => i.classList.remove('off'));
      return;
    }

    elem.forEach(i => {
      const proxyBox = i.children[1].children[0];
      const title = proxyBox.children[1].value;
      const hostname = proxyBox.children[3].value;
      const port = ':' + proxyBox.children[7].value;
      i.classList.toggle('off', ![title, hostname, port].some(k => k.toLowerCase().includes(str)));
    });
  }
}