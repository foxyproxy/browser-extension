import {Flag} from './flag.js';
import {Pattern} from './pattern.js';
import {Popup} from './options-popup.js';
import {Nav} from './nav.js';

export class Log {

  static {
    this.trTemplate = document.querySelector('.log template').content.firstElementChild;
    this.tbody = document.querySelector('.log tbody');
    // used to find proxy
    this.proxyCache = {};
    this.mode = 'disable';

    browser.webRequest.onBeforeRequest.addListener(e => this.process(e), {urls: ['<all_urls>']});

    // onAuthRequired message from authentication.js
    browser.runtime.onMessage.addListener((...e) => this.onMessage(...e));

    // Get Associated Domains
    this.input = document.querySelector('.log input');
    document.querySelector('.log button').addEventListener('click', () => this.getDomains());
    this.select = document.querySelector('.popup select.popup-log-proxy');
    this.select.addEventListener('change', () => this.addPatterns());
  }

  static onMessage(message) {
    const {id, e} = message;
    if (id !== 'onAuthRequired') { return; }

    const tr = this.tbody.children[199] || this.trTemplate.cloneNode(true);
    const [, time, container, method, reqType, doc, url, title, type, host, port, pattern] = tr.children;

    time.textContent = new Date(e.timeStamp).toLocaleTimeString();
    container.classList.toggle('incognito', !!e.incognito);
    container.textContent = e.cookieStoreId?.startsWith('firefox-container-') ? 'C' + e.cookieStoreId.substring(18) : '';
    method.textContent = e.method;
    reqType.textContent = e.statusCode;
    this.prepareOverflow(doc, e.statusLine || '');
    this.prepareOverflow(url, decodeURIComponent(e.url));

    const info = e.challenger || {host: '', port: ''};
    const item = this.proxyCache[`${info.host}:${info.port}`];
    const flag = item?.cc ? Flag.get(item.cc) + ' ' : '';
    title.textContent = flag + (item?.title || '');
    title.style.borderLeftColor = item?.color || 'var(--border)';
    type.textContent = item?.type || '';
    host.textContent = info.host;
    port.textContent = info.port;
    pattern.textContent = '';

    // in reverse order, new on top
    this.tbody.prepend(tr);
  }

  static process(e) {
    const tr = this.tbody.children[199] || this.trTemplate.cloneNode(true);
    const [, time, container, method, reqType, doc, url, title, type, host, port, pattern] = tr.children;

    // shortened forms similar to Developer Tools
    const shortType = {
      'main_frame': 'html',
      'sub_frame': 'iframe',
      image: 'img',
      script: 'js',
      stylesheet: 'css',
      websocket: 'ws',
      xmlhttprequest: 'xhr',
    };

    time.textContent = new Date(e.timeStamp).toLocaleTimeString();
    container.classList.toggle('incognito', !!e.incognito);
    container.textContent = e.cookieStoreId?.startsWith('firefox-container-') ? 'C' + e.cookieStoreId.substring(18) : '';
    method.textContent = e.method;
    reqType.textContent = shortType[e.type] || e.type;
    // For a top-level document, documentUrl is undefined, chrome uses e.initiator
    this.prepareOverflow(doc, e.documentUrl || e.initiator || '');
    this.prepareOverflow(url, decodeURIComponent(e.url));

    const info = e.proxyInfo || {host: '', port: '', type: ''};
    const item = this.proxyCache[`${info.host}:${info.port}`];
    const flag = item?.cc ? Flag.get(item.cc) + ' ' : '';
    title.textContent = flag + (item?.title || '');
    title.style.borderLeftColor = item?.color || 'var(--border)';
    type.textContent = info.type;
    host.textContent = info.host;
    port.textContent = info.port;

    // show matching pattern in pattern mode
    const pat = this.mode === 'pattern' && item?.include.find(i => new RegExp(Pattern.get(i.pattern, i.type), 'i').test(e.url));
    const text = pat?.title || pat?.pattern || '';
    this.prepareOverflow(pattern, text);

    // in reverse order, new on top
    this.tbody.prepend(tr);
  }

  // set title, in case text overflows
  static prepareOverflow(elem, value) {
    elem.textContent = value;
    elem.title = value;
  }

  static getDomains() {
    this.select.classList.add('on');
    const input = this.input.value.trim();
    if (!input) {
      // allow showing empty popup
      Popup.show('');
      return;
    }

    // search Document URL column
    let list = document.querySelectorAll(`.log table td:nth-child(6)[title*="${input}" i]`);
    list = [...list].map(i => i.nextElementSibling.title.split(/\/+/)[1]);
    list = [...new Set(list)].sort();

    // true -> show select
    Popup.show(list.join('\n'));
  }

  static addPatterns() {
    const host = this.select.value;
    if (!host) { return; }

    const text = this.select.previousElementSibling.value.trim();
    if (!text) { return; }

    const title = this.input.value.trim();
    const data = text.split(/\s+/).map(i => ({
      include: 'include',
      type: 'wildcard',
      title,
      pattern: `://${i}/`,
      active: true
    }));

    Popup.hide();
    Nav.get('proxies');

    const ev = new CustomEvent('importPatternCustom', {
      detail: {host, data}
    });
    window.dispatchEvent(ev);
  }
}