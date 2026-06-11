// ---------- import export --------------------------------
export class FS {

  // ----- import
  static async import(e) {
    const file = e.target.files[0];
    switch (true) {
      case !file: alert(browser.i18n.getMessage('error'));
        return;

      // check file MIME type
      case !['text/plain', 'application/json'].includes(file.type):
        alert(browser.i18n.getMessage('fileTypeError'));
        return;
    }

    const data = await this.readFile(e.target.files[0]);
    try { return JSON.parse(data); }
    catch (e) { alert(e); }
  }

  // ----- export
  static async export(dt, saveAs) {
    const data = JSON.stringify(dt, null, 2);
    const extensionName = browser.runtime.getManifest().name;
    const filename = `${extensionName}_${new Date().toISOString().substring(0, 10)}.json`;
    this.writeFile({data, filename, saveAs, type: 'application/json'});
  }

  // --- read file
  static readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = e => reject(e);
      reader.readAsText(file);
    });
  }

  // ----- write file
  static writeFile({data, filename, saveAs, type = 'text/plain'}) {
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1538348
    // [meta] Implement the |downloads| extension API
    // browser.downloads is defined on Android but not working
    const android = navigator.userAgent.includes('Android');
    if (android || !browser.downloads) {
      const a = document.createElement('a');
      a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(data);
      a.setAttribute('download', filename);
      a.dispatchEvent(new MouseEvent('click'));
      return;
    }

    const blob = new Blob([data], {type});
    browser.downloads.download({
      url: URL.createObjectURL(blob),
      filename,
      // Firefox for Android raises an error if saveAs is set to true
      ...(!android && saveAs && {saveAs: true}),
    })
    .catch(() => {});
    // catch() to suppress error: Download canceled by the user
  }
}