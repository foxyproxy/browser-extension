import {App} from './app.js';
import {Proxies} from './options-proxies.js';
import {Spinner} from './spinner.js';
import {Toggle} from './toggle.js';
import {Nav} from './nav.js';

// ---------- import FoxyProxy account (side effect) -------
class ImportAccount {

  static {
    this.username = document.querySelector('.import-account #username');
    this.password = document.querySelector('.import-account #password');
    Toggle.password(this.password.nextElementSibling);
    document.querySelector('.import-account button[data-i18n="import"]').addEventListener('click', () => this.process());
  }

  static async process() {
    // --- check username/password
    const username = this.username.value.trim();
    if (!username) {
      this.username.required = true;
      return;
    }

    const password = this.password.value.trim();
    if (!password) {
      this.password.required = true;
      return;
    }

    const options = [...document.querySelectorAll('.import-account .account-options select')].map(i => i.value);
    // Array(3) [ "https", "hostname", "alt" ]
    const url = options.includes('alt') ?
      'https://bilestoad.com/webservices/get-accounts.php' :
      'https://getfoxyproxy.org/webservices/get-accounts.php';
    const ip = options.includes('ip');
    const socks = options.includes('socks5');
    const https = options.includes('https');

    const proxyDiv = document.querySelector('div.proxy-div');
    const docFrag = document.createDocumentFragment();

    // --- fetch data
    Spinner.show();
    const data = await this.getAccount(url, username, password);
    if (data) {
      data.forEach(i => {
        // proxy template
        const pxy = {
          active: true,
          title: i.hostname.split('.')[0],
          type: socks ? 'socks5' : https ? 'https' : 'http',
          hostname: ip ? i.ip : i.hostname,
          port: socks ? i.socks5_port : https ? i.ssl_port : i.port[0],
          username: i.username,
          password: i.password,
          // convert UK to ISO 3166-1 GB
          cc: i.country_code === 'UK' ? 'GB' : i.country_code,
          city: i.city,
          // random color will be set
          color: '',
          pac: '',
          pacString: '',
          proxyDNS: true,
          include: [],
          exclude: [],
          tabProxy: [],
        };

        docFrag.append(Proxies.addProxy(pxy));
      });

      proxyDiv.append(docFrag);
      Nav.get('proxies');
    }

    Spinner.hide();
  }

  static async getAccount(url, username, password) {
    // --- fetch data
    return fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
    })
    .then(r => r.json())
    .then(data => {
      if (!Array.isArray(data) || !data[0]?.hostname) {
        App.notify(browser.i18n.getMessage('error'));
        return;
      }

      // import active accounts only
      data = data.filter(i => i.active === 'true');
      // sort by country
      data.sort((a, b) => a.country.localeCompare(b.country));
      return data;
    })
    .catch(e => App.notify(`fetch: ${e}`));
  }
}