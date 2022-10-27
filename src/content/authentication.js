// https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/onAuthRequired
// webRequest.onAuthRequired on Firefox only applies to HTTP/HTTPS/WS/WSS (not SOCKS)

// https://bugs.chromium.org/p/chromium/issues/detail?id=1135492
// webRequest.onAuthRequired on Chrome mv3 is not usable due to removal of 'blocking'
// https://source.chromium.org/chromium/chromium/src/+/main:extensions/browser/api/web_request/web_request_api.cc;l=2857
// Chrome 108 new permission 'webRequestAuthProvider'

import './app.js';

class Authentication {

  constructor() {
    this.data = {};
    this.pending = {};                                      // prevent bad authentication loop
    const urls = ['*://*/*'];                               // limit to HTTP, HTTPS and WebSocket URLs
    // temporarily disabled on chrome until Chrome 108
    browser.runtime.getManifest().manifest_version == 2 && browser.webRequest.onAuthRequired.addListener(e => this.process(e), {urls}, ['blocking']); // Chrome 108
    browser.webRequest.onCompleted.addListener(e => this.clearPending(e), {urls});
    browser.webRequest.onErrorOccurred.addListener(e => this.clearPending(e), {urls});
  }

  init(data) {
    this.data = {};                                         // reset data
    data.forEach(item => {                                  // filter out no user/pass or host
      item.hostname && item.username && item.password &&
        (this.data[`${item.hostname}:${item.port}`] = {username: item.username, password: item.password});
    });
    console.log(this.data);
  }

  process(e) {
    if (!e.isProxy) { return; }                             // true for Proxy-Authenticate, false for WWW-Authenticate
    if (this.pending[e.requestId]) { return {cancel: true}; } // already sent once and pending

    const {host, port} = e.challenger;
    const authCredentials = this.data[`${host}:${port}`];
    if (authCredentials) {
      this.pending[e.requestId] = 1;                        // prevent bad authentication loop
      return {authCredentials};
    }
  }

  clearPending(e) {
    !e.error && delete this.pending[e.requestId];
  }
}
export const authentication = new Authentication();
