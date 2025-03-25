// ---------- Bulk Edit (Side Effect) ----------------------
class BulkEdit {

  static {
    const div = document.querySelector('.bulk-edit');
    [this.t1, this.t2, this.s1, this.s2, this.select] = div.children;

    this.t1.addEventListener('change', () => this.toggleProxy('t1'));
    this.s1.addEventListener('change', () => this.toggleProxy('s1'));
    this.t2.addEventListener('change', () => this.togglePattern());
    this.select.addEventListener('change', () => this.process());
  }

  static toggleProxy(i) {
    // remove previous selection
    document.querySelector(`details.proxy.${i}`)?.classList.remove(i);
    const n = this.getNumber(i);
    if (!n) { return; }

    document.querySelector(`details.proxy:nth-of-type(${n})`)?.classList.add(i);

    // reselect t2
    this.togglePattern();
  }

  static togglePattern() {
    // remove previous selection
    const prev = document.querySelector('.pattern-row.t2');
    if (prev) {
      prev.classList.remove('t2');
      prev.closest('details').open = false;
    }

    const n = this.getNumber('t2');
    if (!n) { return; }

    const t = this.getNumber('t1') || this.getNumber('s1');
    if (!t) { return; }

    const elem = document.querySelector(`details.proxy:nth-of-type(${t}) .pattern-row:nth-of-type(${n})`);
    if (elem) {
      elem.classList.add('t2');
      elem.closest('details').open = true;
    }
  }

  static process() {
    if (!this.select.value) { return; }

    const id = this.select.value;
    switch (id) {
      case 'openAll':
      case 'closeAll':
        this.getProxies().forEach(i => i.open = id === 'openAll');
        break;

      case 'setType':
      case 'setPort':
      case 'setTitle':
      case 'setUsername':
      case 'setPassword':
        let s2 = this.s2.value.trim();
        if (!s2) { break; }

        const ref = id.substring(3).toLowerCase();
        if (ref === 'type') {
          s2 = s2.toLowerCase();
          if (!['http', 'https', 'socks4', 'socks5', 'quic', 'pac', 'direct'].includes(s2)) { break; }
        }

        document.querySelectorAll(`[data-id="${ref}"]`).forEach(i =>
          s2.startsWith('+') ? i.value += s2.substring(1) : i.value = s2);
        break;

      case 'deleteProxy':
        this.deleteProxy();
        this.reset();
        break;

      case 'moveProxy':
        this.moveProxy();
        this.reset();
        break;

      case 'movePattern':
        this.movePattern();
        this.reset();
        break;
      }

    // --- reset
    this.select.selectedIndex = 0;
  }

  static reset() {
    document.querySelectorAll('details.proxy:is(.t1, .s1), .pattern-row.t2').forEach(i =>
      i.classList.remove('t1', 't2', 's1'));
    // ['t1', 't2', 's1'].forEach(i => this[i].value = '');
  }

  static getProxies() {
    return document.querySelectorAll('details.proxy');
  }

  static getNumber(i) {
    return this[i].checkValidity() && this[i].value ? this[i].value : null;
  }

  static getSourceNumbers() {
    const n = this.s2.value.match(/\d+-\d+|\d+/g);
    if (!n) { return; }

    let arr = [];
    n.forEach(i => {
      // check if number range e.g. 5-8
      const [a, b] = i.split('-');
      b ? arr.push(...Array.from({length: b - a + 1}, (_, i) => (a * 1) + i)) : arr.push(a);
    });

    // map to index (-1), sort, remove duplicates
    arr = [...new Set(arr.map(i => i - 1).sort((a, b) => a - b))];
    return arr.length ? arr : null;
  }

  static deleteProxy() {
    const n = this.getSourceNumbers();
    if (!n) { return; }

    const p = this.getProxies();
    n.forEach(i => p[i]?.remove());
  }

  static moveProxy() {
    let n = this.getSourceNumbers();
    if (!n) { return; }

    const t1 = this.t1.value - 1;
    const p = this.getProxies();

    // filter target, map to elements, filter non-existing
    n = n.filter(i => i !== t1).map(i => p[i]).filter(Boolean);
    if (!n[0]) { return; }

    // before target or after all
    p[t1] ? p[t1].before(...n) : p[0].parentElement.append(...n);
  }

  static movePattern() {
    const t1 = this.t1.value - 1;
    const s1 = this.s1.value - 1;

    switch (true) {
      // move withing the same proxy
      case t1 === -1 || t1 === s1:
        s1 !== -1 && this.movePatternWithin(s1);
        break;

      // move all patterns to target
      case s1 === -1:
        this.movePatternAll(t1);
        break;

      // move source patterns to target
      default:
        this.movePatternSome(t1, s1);
    }
  }

  static movePatternWithin(s1) {
    let n = this.getSourceNumbers();
    if (!n) { return; }

    const p = this.getProxies();
    if (!p[s1]) { return; }

    const t2 = this.t2.value - 1;

    // filter target, map to elements, filter non-existing
    const pat = p[s1].querySelectorAll('.pattern-row');
    n = n.filter(i => i !== t2).map(i => pat[i]).filter(Boolean);
    if (!n[0]) { return; }

    pat[t2] ? pat[t2].before(...n) : pat[0].parentElement.append(...n);
  }

  static movePatternAll(t1) {
    const n = this.getSourceNumbers();
    if (!n) { return; }

    const p = this.getProxies();
    if (!p[t1]) { return; }

    // filter target, map to elements
    const pat = [];
    n.filter(i => i !== t1).forEach(i => p[i] && pat.push(...p[i].querySelectorAll('.pattern-row')));

    const target = p[t1].querySelector('.pattern-box');
    const row = target.children?.[this.t2.value - 1];
    row ? row.before(...pat) : target.append(...pat);
  }

  static movePatternSome(t1, s1) {
    let n = this.getSourceNumbers();
    if (!n) { return; }

    const p = this.getProxies();
    if (!p[t1] || !p[s1]) { return; }

    // map to elements, filter non-existing
    const pat = p[s1].querySelectorAll('.pattern-row');
    n = n.map(i => pat[i]).filter(Boolean);
    if (!n[0]) { return; }

    const target = p[t1].querySelector('.pattern-box');
    const row = target.children?.[this.t2.value - 1];
    row ? row.before(...n) : target.append(...n);
  }
}