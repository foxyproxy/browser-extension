import {App} from './app.js';

// ---------- Incognito Access (Side Effect) ---------------
class IncognitoAccess {

  static {
    // https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/proxy/settings
    // Changing proxy settings requires private browsing window access because proxy settings affect private and non-private windows.
    // https://github.com/w3c/webextensions/issues/429
    // Inconsistency: incognito in proxy.settings
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1725981
    // proxy.settings is not supported on Android
    App.firefox && !App.android && browser.extension.isAllowedIncognitoAccess()
    .then(response => !response && alert(browser.i18n.getMessage('incognitoAccessError')));
  }
}