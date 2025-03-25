import {Proxies} from './options-proxies.js';
import {Nav} from './nav.js';

// ---------- Import List (Side Effect) --------------------
class ImportList {

  static {
    this.textarea = document.querySelector('.import-proxy-list textarea');
    document.querySelector('.import-proxy-list button').addEventListener('click', () => this.process());
  }

  static process() {
    this.textarea.value = this.textarea.value.trim();
    if (!this.textarea.value) { return; }

    const proxyDiv = document.querySelector('div.proxy-div');
    const docFrag = document.createDocumentFragment();

   for (const item of this.textarea.value.split(/\n+/)) {
      // simple vs Extended format
      const pxy = item.includes('://') ? this.parseExtended(item) : this.parseSimple(item);
      // end on error
      if (!pxy) { return; }

      docFrag.append(Proxies.addProxy(pxy));
    }

    proxyDiv.append(docFrag);
    Nav.get('proxies');
  }

  static parseSimple(item) {
    // example.com:3128:user:pass
    const [hostname, port, username = '', password = ''] = item.split(':');
    if (!hostname || !(port * 1)) {
      alert(`Error: ${item}`);
      return;
    }

    const type = port === '443' ? 'https' : 'http';

    // proxy template
    const pxy = {
      active: true,
      title: '',
      type,
      hostname,
      port,
      username,
      password,
      cc: '',
      city: '',
      color: '',
      pac: '',
      pacString: '',
      proxyDNS: true,
      include: [],
      exclude: [],
      tabProxy: [],
    };

    return pxy;
  }

  static parseExtended(item) {
    // https://user:password@78.205.12.1:21?color=ff00bc&title=work%20proxy
    // https://example.com:443?active=false&title=Work&username=abcd&password=1234&cc=US&city=Miami
    let url;
    try { url = new URL(item); }
    catch (error) {
      alert(`${error}\n\n${item}`);
      return;
    }

    // convert old schemes to type
    let type = url.protocol.slice(0, -1);
    const scheme = {
      proxy: 'http',
      ssl: 'https',
      socks: 'socks5',
    };
    scheme[type] && (type = scheme[type]);
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1851426
    // Reland URL: protocol setter needs to be more restrictive around file (fixed in Firefox 120)
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1603699
    // Enable DefaultURI use for unknown schemes (fixed in Firefox 122)
    // missing hostname, port with socks protocol (#120)
    !url.hostname && (url = new URL('http:' + item.substring(url.protocol.length)));

    const {hostname, port, username, password} = url;
    // set to pram, can be overridden in searchParams
    const pram = {type, hostname, port, username, password};

    // prepare object, make parameter keys case-insensitive
    for (const [key, value] of url.searchParams) {
      pram[key.toLowerCase()] = value;
    }

    // fix missing default port
    const defaultPort = {
      http: '80',
      https: '443',
      ws: '80',
      wss: '443'
    };
    !pram.port && defaultPort[type] && (pram.port = defaultPort[type]);

    // proxy template
    const pxy = {
      // defaults to true
      active: pram.active !== 'false',
      title: pram.title || '',
      type: pram.type.toLowerCase(),
      hostname: pram.hostname,
      port: pram.port,
      username: decodeURIComponent(pram.username),
      password: decodeURIComponent(pram.password),
      cc: (pram.cc || pram.countrycode || '').toUpperCase(),
      city: pram.city || '',
      color: pram.color ? '#' + pram.color : '',
      pac: pram.pac || (pram.type === 'pac' && url.origin + url.pathname) || '',
      pacString: '',
      // defaults to true
      proxyDNS: pram.proxydns !== 'false',
      include: [],
      exclude: [],
      tabProxy: [],
    };

    return pxy;
  }
}