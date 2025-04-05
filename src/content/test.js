import {App} from './app.js';
import {Popup} from './options-popup.js';

// ---------- Proxy Text (Side Effect) ---------------------------
class ProxyTest {

  static {
    document.querySelector('.proxy-top button[data-i18n="test"]').addEventListener('click', () => this.selectOptions());
    this.popupProxy = document.querySelector('.popup select.popup-test-proxy');
    this.popupServer = document.querySelector('.popup select.popup-server');
    this.popupServer.addEventListener('change', () => this.process());
  }

  static selectOptions() {
    if (this.popupProxy.options.length < 2) {
      Popup.show('Did not find a suitable proxy');
      Popup.show('Ending the test');
      return;
    }

    this.popupProxy.classList.add('on');
    this.popupServer.classList.add('on');

    !App.firefox && Popup.show('On Chrome, proxy authentication must be done before starting the test');
    Popup.show('Please select a proxy (or the first one will be selected) and then a server for the test\n');
  }

  static async process(e) {
    this.server = this.popupServer.value;
    if (!this.server) { return; }

    Popup.show('Starting the proxy Test\n');

    // check 'prefers-color-scheme' since it is not available in background service worker
    this.dark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // --- get the IP check server
    const serverText = this.popupServer.selectedOptions[0].textContent;
    Popup.show(`IP check server: ${serverText}`);

    // --- get the proxy for the test
    // selected proxy or the first proxy
    !this.popupProxy.value && (this.popupProxy.selectedIndex = 1);
    const id = this.popupProxy.value;
    const host = this.popupProxy.selectedOptions[0].textContent;

    const pref = await browser.storage.local.get();
    const pxy = pref.data.find(i => id === `${i.hostname}:${i.port}`);

    Popup.show(`Testing proxy: ${host}\n`);

    // --- get real IP
    Popup.show('Setting mode to "Disable" to get your real IP');
    pref.mode = 'disable';
    await this.setProxy(pref);
    const realIP = await this.getIP();

    // --- test Tab Proxy with mode disable
    App.firefox && await this.tabProxy(pxy, realIP);

    // --- test single proxy
    Popup.show(`Setting mode to "${host}"`);
    pref.mode = `${pxy.hostname}:${pxy.port}`;
    await this.setProxy(pref);
    await this.getIP();

    // --- test Proxy by Patterns
    Popup.show('Setting mode to "Proxy by Patterns"');
    // adding patterns to test
    pxy.include = [
      {
        type: 'wildcard',
        title: 'test',
        pattern: new URL(this.server).hostname,
        active: true
      },
    ];
    pref.mode = 'pattern';
    await this.setProxy(pref);
    await this.getIP();

    // --- reset to the original state
    this.reset();
  }

  static async setProxy(pref) {
    // await runtime.sendMessage resolves early on Chrome
    App.firefox ? await this.sendMessage(pref) : await this.chromeSendMessage(pref);
  }

  static sendMessage(pref) {
    return browser.runtime.sendMessage({id: 'setProxy', pref, dark: this.dark, noDataChange: true});
  }

  static async chromeSendMessage(pref) {
    await new Promise(resolve => {
      const listener = () => {
        browser.proxy.settings.onChange.removeListener(listener);
        resolve();
      };
      browser.proxy.settings.onChange.addListener(listener);
      this.sendMessage(pref);
    });
  }

  static async tabProxy(pxy, realIP) {
    Popup.show('Setting Tab Proxy with mode "Disable"');
    const tab = await browser.tabs.create({active: false});
    await browser.runtime.sendMessage({id: 'setTabProxy', proxy: pxy, tab});
    await new Promise(resolve => {
      const listener = e => {
        browser.tabs.remove(tab.id);
        browser.webRequest.onBeforeRequest.removeListener(listener);
        Popup.show(`Your IP: ${e.proxyInfo.host || realIP}\n`);
        resolve();
      };
      browser.webRequest.onBeforeRequest.addListener(listener, {urls: ['<all_urls>'], tabId: tab.id});
      browser.tabs.update(tab.id, {url: this.server});
    });
  }

  static async reset() {
    Popup.show('Resetting options to their original state');
    const pref = await browser.storage.local.get();
    await this.setProxy(pref);
    Popup.show('Ending the proxy test\n');

    // reset select elements
    this.popupProxy.selectedIndex = 0;
    this.popupServer.selectedIndex = 0;
  }

  static async getIP() {
    // Chrome a network request timeouts at 300 seconds, while in Firefox at 90 seconds.
    // AbortSignal.timeout FF100, Ch124
    return fetch(this.server, {cache: 'no-store', signal: AbortSignal.timeout(5000)})
    .then(r => r.ok ? r.text() : this.response(r))
    .then(text => {
      // HTML response is not acceptable
      const ip = text.includes('<') ? 'undefined' : text.trim();
      Popup.show(`Your IP: ${ip}\n`);
      return ip;
    })
    .catch(e => Popup.show(`Your IP: undefined\nStatus: ${e.message}\n`));
  }

  static response(r) {
    switch (r.status) {
      case 403:
        return 'undefined\nStatus: 403 Forbidden';

      default:
        return `undefined\nStatus: ${r.status} ${r.statusText}`;
    }
  }
}