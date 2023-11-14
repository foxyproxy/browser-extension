import {App} from './app.js';

// ---------- Log ------------------------------------------
export class Log {

  static {
    this.trTemplate = document.querySelector('.log template').content.firstElementChild;
    this.tbody = document.querySelector('.log tbody');

    // no proxy info on chrome
    if (App.firefox) {
      this.tbody.textContent = '';                          // remove "not available" notice
      browser.webRequest.onBeforeRequest.addListener(e => this.process(e), {urls: ['*://*/*']});
    }

    this.proxyCache = {};                                   // used to find proxy
  }

  static process(e) {
    const tr = this.tbody.children[199] || this.trTemplate.cloneNode(true);
    const [, time, container, method, doc, url, title, type, host, port] = tr.children;

    time.textContent = this.formatInt(e.timeStamp);
    method.textContent = e.method;
    doc.textContent = e.documentUrl || '';                  // For a top-level document, documentUrl is undefined
    doc.title = e.documentUrl || '';
    url.textContent = decodeURIComponent(e.url);
    url.title = e.url;
    container.classList.toggle('incognito', e.incognito);
    container.textContent = e.cookieStoreId?.startsWith('firefox-container-') ? 'C' + e.cookieStoreId.substring(18) : '';

    const info = e.proxyInfo || {host: '', port: '', type: ''};
    const item = this.proxyCache[`${info.host}:${info.port}`];
    const flag = item?.cc ? App.getFlag(item.cc) + ' ' : '';
    title.textContent = flag + (item?.title || '');
    title.style.borderLeftColor = item?.color || 'var(--border)';
    type.textContent = info.type.toUpperCase();
    host.textContent = info.host;
    port.textContent = info.port;

    this.tbody.prepend(tr);                                 // in reverse order, new on top
  }

  static formatInt(d) {
    return new Intl.DateTimeFormat(navigator.language,
            {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false}).format(new Date(d));
  }
}