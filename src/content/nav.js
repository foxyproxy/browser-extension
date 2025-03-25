import {App} from './app.js';

export class Nav {

  static {
    document.querySelectorAll('label[for^="nav"]').forEach(i =>
      this[i.dataset.i18n] = i.control);
  }

  static get(pram = location.search.substring(1)) {
    pram && this[pram] && (this[pram].checked = true);
  }

  static {
    // --- openShortcutSettings FF137
    const shortcut = document.querySelector('.shortcut-link');
    if (!App.firefox || browser.commands.openShortcutSettings) {
      shortcut.style.display = 'unset';
      shortcut.addEventListener('click', () =>
        App.firefox ? browser.commands.openShortcutSettings() :
          browser.tabs.create({url: 'chrome://extensions/shortcuts'})
      );
    }

    // --- data-link
    const helpLink = document.querySelector('iframe[src="help.html"]').contentDocument.querySelector('.nav-link');
    document.querySelectorAll('[data-link]').forEach(i => i.addEventListener('click', e => {
      const {link} = e.target.dataset;
      if (!link) { return; }

      Nav.get('help');
      helpLink.href = link;
      helpLink.click();
    }));
  }
}