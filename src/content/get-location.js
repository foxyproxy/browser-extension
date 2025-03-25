import {Spinner} from './spinner.js';

// ---------- Get Location (Side Effect) -------------------
class GetLocation {

  static {
    this.proxyDiv = document.querySelector('div.proxy-div');
    document.querySelector('.proxy-top button[data-i18n="getLocation"]').addEventListener('click', () => this.process());
  }

  static async process() {
    const ignore = ['127.0.0.1', 'localhost'];

    let {data} = await browser.storage.local.get({data: []});
    data = data.filter(i => i.type !== 'direct' && !ignore.includes(i.hostname)).map(i => i.hostname);
    if (!data[0]) { return; }

    // remove duplicates
    const hosts = [...new Set(data)];

    Spinner.show();

    fetch('https://getfoxyproxy.org/webservices/lookup.php?' + hosts.join('&'))
    .then(response => response.json())
    .then(json => this.updateLocation(json))
    .catch(error => {
      Spinner.hide();
      alert(error);
    });
  }

  static updateLocation(json) {
    // update display
    this.proxyDiv.querySelectorAll('[data-id="cc"], [data-id="city"]').forEach(i => {
      const {hostname, id} = i.dataset;
      // cache old value to compare
      const value = i.value;
      json[hostname]?.[id] && (i.value = json[hostname][id]);
      // dispatch change event
      id === 'cc' && i.value !== value && i.dispatchEvent(new Event('change'));
    });

    Spinner.hide();
  }
}