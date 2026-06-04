import {App} from './app.js';

// ---------- WebRTC (side effect) -------------------------
class WebRTC {

  static {
    this.limitWebRTC = document.querySelector('#limitWebRTC');

    // firefox only
    this.toggleWebRTC = document.querySelector('#toggleWebRTC');
    App.firefox && this.toggleWebRTC.addEventListener('change', () => this.toggle());

    // firefox only option
    App.firefox || (this.limitWebRTC.lastElementChild.disabled = true);
    this.limitWebRTC.addEventListener('change', () => this.limit());

    this.init();
  }

  static async init() {
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/permissions/request
    // Any permissions granted are retained by the extension, even over upgrade and disable/enable cycling.
    // check if permission is granted
    const permission = await browser.permissions.contains({permissions: ['privacy']});
    if (!permission) { return; }

    // check peerConnectionEnabled
    const res = App.firefox && await browser.privacy.network.peerConnectionEnabled.get({});
    App.firefox && (this.toggleWebRTC.checked = res.value);

    // check webRTCIPHandlingPolicy
    const result = await browser.privacy.network.webRTCIPHandlingPolicy.get({});
    this.limitWebRTC.value = result.value;
  }

  // firefox only
  static async toggle() {
    // request permission, Firefox for Android version 102
    const permission = await browser.permissions.request({permissions: ['privacy']});
    if (!permission) { return; }

    // { levelOfControl: "controllable_by_this_extension", value: true }
    browser.privacy.network.peerConnectionEnabled.set({value: this.toggleWebRTC.checked});
  }

  static async limit() {
    // request permission, Firefox for Android version 102
    const permission = await browser.permissions.request({permissions: ['privacy']});
    if (!permission) { return; }

    // https://bugzilla.mozilla.org/show_bug.cgi?id=1790270
    // WebRTC bypasses Network settings & proxy.onRequest
    // {"levelOfControl": "controllable_by_this_extension", "value": "default"}
    browser.privacy.network.webRTCIPHandlingPolicy.set({value: this.limitWebRTC.value});
  }
}