import {Popup} from './options-popup.js';

// ---------- Ping (Side Effect) ---------------------------
class Ping {

  static {
    document.querySelector('.proxy-top button[data-i18n="ping"]').addEventListener('click', () => this.process());
  }

  static async process() {
    let {data} = await browser.storage.local.get({data: []});
    data = data.filter(i => i.active);
    if (!data[0]) { return; }

    // --- text formatting
    const n = 4;
    const pType = Math.max(...data.map(i => i.type.length)) + n;
    const pHost = Math.max(...data.map(i =>
      (i.title || i.pac || `${i.hostname}:${parseInt(i.port)}`).length)) + n;
    const format = n => new Intl.NumberFormat().format(n).padStart(8, ' ');

    data.forEach(i => {
      const t = performance.now();
      const host = `${i.hostname}:${parseInt(i.port)}`;
      const url = i.pac || `http://${host}/`;
      const target = i.type.padEnd(pType, ' ') + (i.title || i.pac || host).padEnd(pHost, ' ');

      if (['direct'].includes(i.type)) {
        Popup.show(`${target}${'--- --'.padStart(11, ' ')} (${i.type})\n`);
        return;
      }

      if (['127.0.0.1'].includes(i.hostname)) {
        Popup.show(`${target}${'--- --'.padStart(11, ' ')} (${i.hostname})\n`);
        return;
      }

      fetch(url, {method: 'HEAD'})
      .then(() => Popup.show(`${target}${format(performance.now() - t)} ms\n`))
      .catch(e => Popup.show(`${target}${e.message}\n`),);
    });
  }
}