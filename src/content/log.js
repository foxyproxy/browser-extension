import {App} from './app.js';
import {Pattern} from './pattern.js';

// ---------- Log ------------------------------------------
export class Log {

  static {
    this.trTemplate = document.querySelector('.log template').content.firstElementChild;
    this.tbody = document.querySelector('.log tbody');
    this.proxyCache = {};                                   // used to find proxy
    this.mode = 'disable';
    browser.webRequest.onBeforeRequest.addListener(e => this.process(e), {urls: ['*://*/*']});
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

    time.textContent = this.formatInt(e.timeStamp);
    method.textContent = e.method;
    reqType.textContent = shortType[e.type] || e.type;
    // For a top-level document, documentUrl is undefined, chrome uses e.initiator
    this.prepareOverflow(doc, e.documentUrl || e.initiator || '');
    this.prepareOverflow(url, decodeURIComponent(e.url));
    container.classList.toggle('incognito', !!e.incognito);
    container.textContent = e.cookieStoreId?.startsWith('firefox-container-') ? 'C' + e.cookieStoreId.substring(18) : '';

    const info = e.proxyInfo || {host: '', port: '', type: ''};
    const item = this.proxyCache[`${info.host}:${info.port}`];
    const flag = item?.cc ? App.getFlag(item.cc) + ' ' : '';
    title.textContent = flag + (item?.title || '');
    title.style.borderLeftColor = item?.color || 'var(--border)';
    type.textContent = info.type;
    host.textContent = info.host;
    port.textContent = info.port;

    // show matching pattern in pattern mode
    const pat = this.mode === 'pattern' && item?.include.find(i => new RegExp(Pattern.get(i.pattern, i.type), 'i').test(e.url));
    const text = pat?.title || pat?.pattern || '';
    this.prepareOverflow(pattern, text);

    this.tbody.prepend(tr);                                 // in reverse order, new on top
  }

  static formatInt(d) {
    return new Intl.DateTimeFormat(navigator.language,
            {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false}).format(new Date(d));
  }

  // set title, in case text overflows
  static prepareOverflow(elem, value) {
    elem.textContent = value;
    elem.title = value;
  }
}