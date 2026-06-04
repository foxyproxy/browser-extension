import {App} from './app.js';

export class Nav {

  static {
    document.querySelectorAll('nav input[name="nav"]').forEach(i =>
      this[i.parentElement.dataset.i18n] = i);
  }

  static get(pram = location.search.substring(1)) {
    pram && this[pram] && (this[pram].checked = true);
  }

  static {
    // help document
    const help = document.querySelector('iframe[src="help.html"]').contentDocument;

    // --- data-link
    const helpLink = help.querySelector('.nav-link');
    document.querySelectorAll('[data-link]').forEach(i => i.addEventListener('click', e => {
      const {link} = e.target.dataset;
      if (!link) { return; }

      Nav.get('help');
      helpLink.href = link;
      helpLink.click();
    }));

    // --- Extension link in the Help
    // not for Firefox
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1956860

    // chrome
    if (!App.firefox) {
      const link = help.querySelector('.chrome-extension');
      link.style.display = 'unset';
      link.addEventListener('click', () =>
        browser.tabs.create({url: 'chrome://extensions/?id=' + location.hostname}));
    }

    // --- openShortcutSettings FF137
    const shortcut = document.querySelector('.shortcut-link');
    // commands is not supported on Android
    if (!App.firefox || browser.commands?.openShortcutSettings) {
      shortcut.style.display = 'unset';
      shortcut.addEventListener('click', () =>
        App.firefox ? browser.commands.openShortcutSettings() :
          browser.tabs.create({url: 'chrome://extensions/shortcuts'})
      );
    }
  }
}