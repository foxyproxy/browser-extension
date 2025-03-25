export class Pattern {

  // showError from options.js, not from migrate.js
  static validate(str, type, showError) {
    // --- match pattern
    if (type === 'match') {
      if (this.validMatchPattern(str)) { return true; }

      // not valid
      if (showError) {
        const error = this.checkMatchPattern(str);
        error && alert([browser.i18n.getMessage('regexError'), str, error].join('\n'));
      }
      return;
    }

    // --- wildcard & regex
    const pat = this.get(str, type);
    try {
      new RegExp(pat);
      return true;
    }
    catch (error) {
      showError && alert([browser.i18n.getMessage('regexError'), str, error].join('\n'));
    }
  }

  static get(str, type) {
    return type === 'wildcard' ? this.convertWildcard(str) :
      type === 'match' ? this.convertMatchPattern(str) : str;
  }

  // convert wildcard to regex string
  static convertWildcard(str) {
    // catch all
    if (str === '*') { return '\\w+'; }

    // no need to add scheme as search parameters are encoded url=https%3A%2F%2F
    // escape regular expression special characters, minus * ?
    return str.replace(/[.+^${}()|[\]\\]/g, '\\$&')
              .replace(/^\*|\*$/g, '')                      // trim start/end *
              .replaceAll('*', '.*')
              .replaceAll('?', '.');
  }

  // convert match pattern to regex string
  static convertMatchPattern(str) {
    // catch all
    if (str === '<all_urls>') { return '\\w+'; }

    // escape regular expression special characters, minus *
    str = str.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
              .replace('*://', '.+://')                     // convert * scheme
              .replace('://*\\.', '://(.+\\.)?')            // match domains & subdomains
              .replaceAll('*', '.*');

    // match pattern matches the whole URL
    return '^' + str + '$';
  }

  static checkMatchPattern(str) {
    // catch all
    if (str === '<all_urls>') { return; }

    const [, scheme, host] = str.match(/^(.+):\/\/([^/]+)\/(.*)$/) || [];

    switch (true) {
      case !scheme || !host:
        // Invalid Pattern
        return browser.i18n.getMessage('invalidPatternError');

      case !['*', 'http', 'https', 'ws', 'wss'].includes(scheme):
        // "*" in scheme must be the only character | Unsupported scheme
        const msg = scheme.includes('*') ? 'schemeError' : 'unsupportedSchemeError';
        return browser.i18n.getMessage(msg);

      case host.substring(1).includes('*'):
        // "*" in host must be at the start
        return browser.i18n.getMessage('hostError');

      case host.startsWith('*') && !host.startsWith('*.'):
        // "*" in host must be the only character or be followed by "."
        return browser.i18n.getMessage('hostDotError');

      case host.includes(':'):
        // Host must not include a port number
        return browser.i18n.getMessage('portError');
    }
  }

  // --- test match pattern validity
  static validMatchPattern(p) {
    // file: is not valid for proxying purpose
    return p === '<all_urls>' ||
      /^(https?|\*):\/\/(\*|\*\.[^*:/]+|[^*:/]+)\/.*$/i.test(p);
  }

  static getPassthrough(str) {
    if (!str) { return [[], [], []]; }

    // RegExp string
    const regex = [];
    // 10.0.0.0/24 -> [ip, mask] e.g ['10.0.0.0', '255.255.255.0']
    const ipMask = [];
    // 10.0.0.0/24 -> [start, end] e.g. ['010000000000', '010000000255']
    const stEnd = [];

    str.split(/[\s,;]+/).forEach(i => {
      // The literal string <local> matches simple hostnames (no dots)
      if (i === '<local>') {
        regex.push('.+://[^.]+/');
        return;
      }

      // --- CIDR
      const [, ip, , mask] = i.match(/^(\d+(\.\d+){3})\/(\d+)$/) || [];
      if (ip && mask) {
        const netmask = this.getNetmask(mask);
        ipMask.push(ip, netmask);
        stEnd.push(this.getRange(ip, netmask));
        return;
      }

      // --- pattern
      i = i.replaceAll('.', '\\.')                          // literal '.'
            .replaceAll('*', '.*');                         // wildcard

      // starting with '.'
      i.startsWith('\\.') && (i = '.+://.+' + i);
      // add scheme
      !i.includes('://') && (i = '.+://' + i);
      // add start assertion
      // !i.startsWith('^') && (i = '^' + i);
      // add pathname
      i += '/';
      regex.push(i);
    });

    return [regex, ipMask, stEnd];
  }

  // ---------- CIDR ---------------------------------------
  // convert mask to netmask
  static getNetmask(mask) {
    return [...Array(4)].map(() => {
      const n = Math.min(mask, 8);
      mask -= n;
      return 256 - Math.pow(2, 8 - n);
    }).join('.');
  }

  // convert to padded start & end
  static getRange(ip, mask) {
    // ip array
    let st = ip.split('.');
    // mask array
    const ma = mask.split('.');
    // netmask wildcard array
    let end = st.map((v, i) => Math.min(v - ma[i] + 255, 255) + '');
    st = st.map(i => i.padStart(3, '0')).join('');
    end = end.map(i => i.padStart(3, '0')).join('');

    return [st, end];
  }
}