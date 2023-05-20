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

  // convert wildcard to Regex string
  static convertWildcard(str) {
    // escape Regular Expression Special Characters, minus * ?
    return str.replace(/[$.+()^{}\]\[|]/g, '\\$&')
              .replace(/\*/g, '.*')
              .replace(/\?/g, '.')
              .replace(/:\/\/\.\*\\./g, '://(.*\\.)?');
  }
}