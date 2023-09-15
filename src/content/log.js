import {App} from './app.js';

// ---------- Log (Side Effect) ----------------------------
class ShowLog {

  static {
    this.trTemplate = document.querySelector('.log template').content.firstElementChild;
    this.tbody = document.querySelector('.log tbody');

    // no proxy info on chrome
    if (App.firefox) {
      this.tbody.textContent = '';                          // remove "not available" notice
      browser.webRequest.onBeforeRequest.addListener(e => this.process(e), {urls: ['*://*/*']});
    }
  }

  static process(e) {
    if (!e.proxyInfo) { return; }

    const tr = this.tbody.children[99] || this.trTemplate.cloneNode(true);
    const td = tr.children;

    td[0].title = e.documentUrl || '';
    td[0].textContent = e.documentUrl || '';
    td[1].title = e.url;
    td[1].textContent = e.url;
    td[2].textContent = e.method;
    td[3].children[0].textContent = e.proxyInfo.host;
    td[3].children[1].textContent = `:${e.proxyInfo.port}`;
    td[4].textContent = this.formatInt(e.timeStamp);

    this.tbody.prepend(tr);                                 // in reverse order, new on top
  }

  static formatInt(d) {
    return new Intl.DateTimeFormat(navigator.language,
                    {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false}).format(new Date(d));
  }
}