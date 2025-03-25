import {Pattern} from './pattern.js';
import {Nav} from './nav.js';

export class Tester {

  static {
    this.select = document.querySelector('.tester select');
    this.select.addEventListener('change', () => this.process());
    [this.pattern, this.url] = document.querySelectorAll('.tester input');
    [this.pre, this.pre2] = document.querySelectorAll('.tester pre');

    // convert generated HTML to plaintext
    this.pre.addEventListener('input', e => {
      if ((e.data || e.inputType === 'insertFromPaste') && this.pre.matches('.tested')) {
        [...this.pre.children].forEach(i => i.replaceWith(i.textContent));
        this.pre.classList.remove('tested');
      }
    });

    document.querySelector('.tester button[data-i18n="back"]').addEventListener('click', () => this.back());
    document.querySelector('.tester button[data-i18n="test"]').addEventListener('click', () => this.process());
    document.querySelector('.tester button.proxyByPatterns').addEventListener('click', () => this.processURL());
  }

  static process() {
    this.pattern.value = this.pattern.value.trim();
    const str = this.pre.textContent.trim();
    if (!this.pattern.value || !str) {
      return;
    }

    // validate pattern
    const valid = Pattern.validate(this.pattern.value, this.select.value, true);
    if (!valid) { return; }

    // convert pattern to regex string if needed
    const pat = Pattern.get(this.pattern.value, this.select.value);
    const regex = new RegExp(pat, 'i');
    const arr = [];
    str.split(/\s/).forEach(i => {
      const sp = document.createElement('span');
      sp.textContent = i;
      i.trim() && (sp.className = regex.test(i) ? 'pass' : 'fail');
      arr.push(sp, '\n');
    });

    this.pre.textContent = '';
    this.pre.append(...arr);
    // mark pre, used for 'input' event
    this.pre.classList.add('tested');
  }

  static back() {
    if (!this.target) { return; }

    // show Proxy tab
    Nav.get('proxies');

    // go to target proxy
    const details = this.target.closest('details');
    details.open = true;
    this.target.scrollIntoView({behavior: 'smooth'});
    this.target.focus();

    // reset
    this.target = null;
  }

  static async processURL() {
    const url = this.url.value.trim();
    if (!url || !this.url.checkValidity()) { return; }

    let {data} = await browser.storage.local.get({data: []});
    data = data.filter(i => i.active && !i.pac && (i.include[0] || i.exclude[0] || i.tabProxy?.[0])).map(item => {
      item.tabProxy ||= [];
      return {
        type: item.type,
        hostname: item.hostname,
        port: item.port,
        title: item.title,
        include: item.include.filter(i => i.active),
        exclude: item.exclude.filter(i => i.active),
        tabProxy: item.tabProxy.filter(i => i.active),
      };
    });

    const match = arr => arr.find(i => new RegExp(Pattern.get(i.pattern, i.type), 'i').test(url));

    let arr = [];

    data.forEach(i => {
      const target = i.title || `${i.hostname}:${parseInt(i.port)}`;
      if (!match(i.exclude)) {
        const p = match(i.include);
        p && arr.push([target, p.type, p.pattern]);
      }
      const p = match(i.tabProxy);
      p && arr.push([target, p.type, p.pattern, '(Tab Proxy)']);
    });

    if (!arr[0]) {
      this.pre2.textContent = '⮕ DIRECT';
      return;
    }

    // --- text formatting
    const n = 4;
    const w = 'wildcard'.length + n;
    const p0 = Math.max(...arr.map(i => i[0].length)) + n;
    const p2 = Math.max(...arr.map(i => i[2].length)) + n;

    // undefined or null is converted to an empty string in  join()
    arr = arr.map(i => [i[0].padEnd(p0, ' '), i[1].padEnd(w, ' '), i[2].padEnd(p2, ' '), i[3]].join('').trim());
    this.pre2.textContent = arr.join('\n');
  }
}