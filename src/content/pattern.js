export class Pattern {

  static validate(str, type, showError) {
    const pat = this.get(str, type);
    try {
      new RegExp(pat);
      return true;
    }
    catch(error) {
      showError && alert([browser.i18n.getMessage('regexError'), str, error].join('\n'));
    }
  }

  static get(str, type) {
    return type === 'wildcard' ? this.convertWildcard(str) : str;
  }

  // convert wildcard to regex string
  static convertWildcard(str) {
    if (str === '*') { return '\S+'; }

    // escape regular expression special characters, minus * ?
    return str.replace(/[$.+()^{}\]\[|]/g, '\\$&')
              .replace(/\*/g, '.*')
              .replace(/\?/g, '.')
              .replace(/:\/\/\.\*\\./g, '://(.*\\.)?');
  }

  static getPassthrough(str) {
    return str.split(/[\s,;]+/).map(i => {
      if (i === '<local>') { return '^[a-z]+://[^.]+/'; }  // The literal string <local> matches simple hostnames (no dots)

      i = i.replaceAll('.', '\\.')                          // literal '.'
            .replaceAll('*', '.*');                         // wildcard
      i.startsWith('\\.') && (i = '^[a-z]+://.*' + i);      // starting with '.'
      !i.includes('://') && (i = '^[a-z]+://' + i);         // add scheme
      !i.startsWith('^') && (i = '^' + i);                  // add start with assertion
      i += '/';                                             // add end of host forward slash
      return i;
    });
  }
}