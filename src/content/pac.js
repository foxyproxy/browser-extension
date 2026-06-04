import {Spinner} from './spinner.js';
import {Popup} from './options-popup.js';

export class PAC {

  static async view(url) {
    if (!url) { return; }

    const text = await this.get(url);
    Popup.show(text);
  }

  static async get(url) {
    Spinner.show();
    const text = await fetch(url).then(r => r.text()).catch(e => alert(`fetch: ${e}`));
    Spinner.hide();
    return text;
  }
}