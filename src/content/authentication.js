// webRequest.onAuthRequired: Firefox HTTP/HTTPS/WS/WSS | Chrome: HTTP/HTTPS
// 'webRequestAuthProvider' permission Chrome 108, Firefox 126

export class Authentication {

  static {
    this.data = {};
    // prevent bad authentication loop
    this.pending = {};
    // webRequest.onAuthRequired is only called for HTTP and HTTPS/TLS proxy servers
    const urls = ['<all_urls>'];
    browser.webRequest.onAuthRequired.addListener(e => this.process(e), {urls}, ['blocking']);
    browser.webRequest.onCompleted.addListener(e => this.clearPending(e), {urls});
    browser.webRequest.onErrorOccurred.addListener(e => this.clearPending(e), {urls});
  }

  static init(data) {
    // reset data
    this.data = {};
    data.forEach(i => {
      const {hostname, port, username, password} = i;
      hostname && port && username && password &&
        (this.data[`${hostname}:${port}`] = {username, password});
    });
  }

  static process(e) {
    // true for Proxy-Authenticate, false for WWW-Authenticate
    if (!e.isProxy) { return; }

    // sending message to log.js
    browser.runtime.sendMessage({id: 'onAuthRequired', e});

    // already sent once and pending
    if (this.pending[e.requestId]) {
      return {cancel: true};
    }

    const {host, port} = e.challenger;
    const authCredentials = this.data[`${host}:${port}`];
    if (authCredentials) {
      // prevent bad authentication loop
      this.pending[e.requestId] = 1;
      return {authCredentials};
    }
  }

  static clearPending(e) {
    delete this.pending[e.requestId];
  }
}