import {App} from './app.js';

// ---------- WebRTC (Side Effect) -------------------------
class WebRTC {

  static {
    this.webRTC = document.querySelector('#limitWebRTC');
    // firefox only option
    !App.firefox && (this.webRTC.lastElementChild.disabled = true);
    this.webRTC.addEventListener('change', () => this.process());
    this.init();
  }

  static async init() {
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/permissions/request
    // Any permissions granted are retained by the extension, even over upgrade and disable/enable cycling.
    // check if permission is granted
    this.permission = await browser.permissions.contains({permissions: ['privacy']});

    // check webRTCIPHandlingPolicy
    if (this.permission) {
      const result = await browser.privacy.network.webRTCIPHandlingPolicy.get({});
      this.webRTC.value = result.value;
    }
  }

  static async process() {
    if (!this.permission) {
      // request permission, Firefox for Android version 102
      this.permission = await browser.permissions.request({permissions: ['privacy']});
      if (!this.permission) { return; }
    }

    // https://bugzilla.mozilla.org/show_bug.cgi?id=1790270
    // WebRTC bypasses Network settings & proxy.onRequest
    // {"levelOfControl": "controllable_by_this_extension", "value": "default"}
    browser.privacy.network.webRTCIPHandlingPolicy.set({value: this.webRTC.value});
  }
}