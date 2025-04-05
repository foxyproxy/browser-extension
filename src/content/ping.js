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
    // performance.now() Firefox 280160 | Chrome 447156.4000000004
    const format = n => new Intl.NumberFormat().format(n.toFixed()).padStart(8, ' ');
    const dash = '--- --'.padStart(11, ' ');

    data.forEach(i => {
      const t = performance.now();
      const host = `${i.hostname}:${parseInt(i.port)}`;
      const url = i.pac || (i.type.startsWith('http') ? `${i.type}://${host}/` : `http://${host}/`);
      const target = i.type.padEnd(pType, ' ') + (i.title || i.pac || host).padEnd(pHost, ' ');

      if (['direct'].includes(i.type)) {
        Popup.show(`${target}${dash}  ${i.type}`);
        return;
      }

      // Chrome a network request timeouts at 300 seconds, while in Firefox at 90 seconds.
      // AbortSignal.timeout FF100, Ch124
      fetch(url, {method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(5000)})
      .then(r => {
        const st = ![200, 400].includes(r.status) ? `  ${r.status} ${r.statusText}` : '';
        Popup.show(`${target}${format(performance.now() - t)} ms${st}`);
      })
      .catch(e => Popup.show(`${target}${dash}  ${e.message}`));
    });
  }
}