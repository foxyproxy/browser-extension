// prevent proxy.onRequest.addListener unloading in MV3 (default 30s)
// https://bugzilla.mozilla.org/show_bug.cgi?id=1771203
// it can trigger DNS leak on reloading under limited circumstances
// https://bugzilla.mozilla.org/show_bug.cgi?id=1882276

// ---------- persist (side effect) ------------------------
class Persist {

  static {
    browser.webRequest.onBeforeRequest.addListener(() => this.set(), {urls: ['<all_urls>']});

    this.set();
  }

  static set() {
    // clear the previous interval & set a new one
    clearInterval(this.interval);
    this.interval = setInterval(() => browser.runtime.getPlatformInfo(), 25_000);
  }
}