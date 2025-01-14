# ![FoxyProxy](/src/image/icon.svg) FoxyProxy Browser Extension

[![license](https://img.shields.io/github/license/foxyproxy/browser-extension.svg)](https://github.com/foxyproxy/browser-extension/blob/master/LICENSE)
[![GitHub repo size](https://img.shields.io/github/repo-size/foxyproxy/browser-extension?logo=github&logoColor=fff)](https://github.com/foxyproxy/browser-extension)
[![ECMAScript](https://img.shields.io/badge/ECMAScript-2022_(ES13)-blue?style=plastic&logo=javascript)](https://262.ecma-international.org/13.0/index.html)



[About/Changelog](https://foxyproxy.github.io/browser-extension/src/content/about.html) | [Help](https://foxyproxy.github.io/browser-extension/src/content/help.html) | [Issues](https://github.com/foxyproxy/browser-extension/issues)

After some years of stability, FoxyProxy has been updated to support Manifest Version 3 which is required by Chrome in order for extensions to be compatible with Chrome in 2024. We took advantage of this forced update to implement many feature requests and other changes that were requested over the years.

FoxyProxy has been owned and developed consistently by the same team since 2006.

The repository has the source code for version 8.0+  for *Firefox*, *Chrome*, and other Chromium-based browsers like *Chromium*, *Brave* and *Edge*. Source code for [older versions](https://github.com/foxyproxy/firefox-extension).

## Permissions

- **downloads**: Used to save/export user preferences to file, for backup or sharing
- **notifications**: Used to inform users (e.g. for errors)
- **proxy**: Used to set proxies (core function of the extension)
- **storage**: Used to store user preferences
- **tabs**: Used to get tab details (e.g. for "Quick Add", "Tab Proxy", & "Incognito/Container Proxy")
- **webRequest**: Used to provide proxy authentication
- **webRequestAuthProvider**: Used to provide proxy authentication
- **host permission**: Used to provide proxy authentication (to any URL `"<all_urls>"`)

#### Optional Permissions

- **browsingData**: Used for "Delete Browsing Data" button to delete cookies, indexedDB, and localStorage, only if requested by the user
- **privacy**: Used for "Limit WebRTC" button to toggle `browser.privacy.network.webRTCIPHandlingPolicy`, only if requested by the user

## Mini FAQ

- **Why is there a [CryptoJS](https://code.google.com/archive/p/crypto-js/) library in [lib](https://github.com/foxyproxy/browser-extension/tree/main/src/lib)?**<br>
The CryptoJS library was already included in [FoxyProxy 3.x](https://github.com/foxyproxy/Foxyproxy_Chrome/blob/f1bca1c50dfa30908c79a9ea477f31eda2abacf4/app/scripts/stored-credentials.js#L4) to encrypt user credentials. It is needed to migrate encrypted settings from the old version (which had no updates for many years, as you mentioned). It is not used to encrypt anything; only to decrypt old data when upgrading from version 3.x to 8.x.<br>
The library is not used in Firefox, and will be removed once users migrate to v8+.

- **Remote Code**<br>
No remote code is used in this extension.

## Screenshots

### Dark Theme

<img src="/screenshots/8.1/dark-theme/popup.jpg" width="200" alt=""> <img src="/screenshots/8.1/dark-theme/options-tab.jpg" width="200" alt="">
<img src="/screenshots/8.1/dark-theme/proxies-tab.jpg" width="200" alt=""> <img src="/screenshots/8.1/dark-theme/import-tab.jpg" width="200" alt="">
<img src="/screenshots/8.1/dark-theme/pattern-tester-tab.jpg" width="200" alt=""> <img src="/screenshots/8.1/dark-theme/log-tab.jpg" width="200" alt="">

### Light Theme

<img src="/screenshots/8.1/light-theme/popup.jpg" width="200" alt=""> <img src="/screenshots/8.1/light-theme/options-tab.jpg" width="200" alt="">
<img src="/screenshots/8.1/light-theme/proxies-tab.jpg" width="200" alt=""> <img src="/screenshots/8.1/light-theme/import-tab.jpg" width="200" alt="">
<img src="/screenshots/8.1/light-theme/pattern-tester-tab.jpg" width="200" alt=""> <img src="/screenshots/8.1/light-theme/log-tab.jpg" width="200" alt="">

## Releases

<table>
  <thead>
    <tr>
      <th></th>
      <th>Chrome</th>
      <th>Firefox</th>
      <th>Edge</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Standard</td>
      <td>
        <a href="https://chromewebstore.google.com/detail/foxyproxy-standard/gcknhkkoolaabfmlnjonogaaifnjlfnp"><img src="https://img.shields.io/chrome-web-store/v/gcknhkkoolaabfmlnjonogaaifnjlfnp?logo=googlechrome&logoColor=fff&label=Chrome%20108%2B" alt=""></a><br>
        <a href="https://chromewebstore.google.com/detail/foxyproxy-standard/gcknhkkoolaabfmlnjonogaaifnjlfnp"><img src="https://img.shields.io/chrome-web-store/users/gcknhkkoolaabfmlnjonogaaifnjlfnp" alt=""></a>
      </td>
      <td>
        <a href="https://addons.mozilla.org/firefox/addon/foxyproxy-standard/"><img src="https://img.shields.io/amo/v/foxyproxy-standard?logo=firefoxbrowser&logoColor=fff&label=Firefox%2093%2B" alt=""></a><br>
        <a href="https://addons.mozilla.org/firefox/addon/foxyproxy-standard/"><img src="https://img.shields.io/amo/users/foxyproxy-standard" alt=""></a>
        <a href="https://addons.mozilla.org/firefox/addon/foxyproxy-standard/"><img src="https://img.shields.io/amo/dw/foxyproxy-standard" alt=""></a>
      </td>
      <td>
       <a href="https://microsoftedge.microsoft.com/addons/detail/foxyproxy/flcnoalcefgkhkinjkffipfdhglnpnem"><img src="https://img.shields.io/badge/dynamic/json?label=Edge%20108%2B%20&prefix=v&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fflcnoalcefgkhkinjkffipfdhglnpnem" alt=""></a><br>
       <a href="https://microsoftedge.microsoft.com/addons/detail/foxyproxy/flcnoalcefgkhkinjkffipfdhglnpnem"><img src="https://img.shields.io/badge/dynamic/json?label=users&query=%24.activeInstallCount&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fflcnoalcefgkhkinjkffipfdhglnpnem" alt=""></a>
       <a href="https://microsoftedge.microsoft.com/addons/detail/foxyproxy/flcnoalcefgkhkinjkffipfdhglnpnem"><img src="https://img.shields.io/badge/dynamic/json?label=rating&suffix=/5&query=%24.averageRating&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fflcnoalcefgkhkinjkffipfdhglnpnem" alt=""></a>
      </td>
    </tr>
    <tr>
      <td>Basic</td>
      <td>
        <a href="https://chromewebstore.google.com/detail/foxyproxy-basic/dookpfaalaaappcdneeahomimbllocnb"><img src="https://img.shields.io/chrome-web-store/v/dookpfaalaaappcdneeahomimbllocnb?logo=googlechrome&logoColor=fff&label=Chrome%20108%2B" alt=""></a><br>
        <a href="https://chromewebstore.google.com/detail/foxyproxy-basic/dookpfaalaaappcdneeahomimbllocnb"><img src="https://img.shields.io/chrome-web-store/users/dookpfaalaaappcdneeahomimbllocnb" alt=""></a>
      </td>
      <td>
        <a href="https://addons.mozilla.org/firefox/addon/foxyproxy-basic/"><img src="https://img.shields.io/amo/v/foxyproxy-basic?logo=firefoxbrowser&logoColor=fff&label=Firefox%2093%2B" alt=""></a><br>
        <a href="https://addons.mozilla.org/firefox/addon/foxyproxy-basic/"></a><img src="https://img.shields.io/amo/users/foxyproxy-basic" alt="">
        <a href="https://addons.mozilla.org/firefox/addon/foxyproxy-basic/"></a><img src="https://img.shields.io/amo/dw/foxyproxy-basic" alt="">
      </td>
      <td></td>
    </tr>
    <tr>
      <td>Source Code Beta</td>
      <td colspan="3"><a href="https://github.com/foxyproxy/browser-extension/tree/main/src"><img src="https://img.shields.io/badge/dynamic/json?&url=https%3A%2F%2Fraw.githubusercontent.com%2Ffoxyproxy%2Fbrowser-extension%2Fmain%2Fsrc%2Fmanifest-firefox.json&query=%24.version&logo=github&logoColor=fff&label=FoxyProxy%20Beta&color=f60&prefix=v" alt=""></a></td>
    </tr>
    <tr>
      <td>Source Code Release</td>
      <td colspan="3"><a href="https://github.com/foxyproxy/browser-extension/releases">Releases</a></td>
    </tr>
    <tr>
      <td>Source Code Old</td>
      <td><a href="https://github.com/foxyproxy/Foxyproxy_Chrome">3.0.7.1</a></td>
      <td><a href="https://github.com/foxyproxy/firefox-extension/">7.5.1</a></td>
      <td></td>
    </tr>
  </tbody>
</table>


### Browser Minimum

<table>
  <thead>
    <tr>
      <th>Chrome</th>
      <th>Firefox</th>
      <th>Firefox for Android</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>version 108<br><i>(released 2022-11-29)</i></td>
      <td>version 93<br><i>(released 2021-10-05)</i></td>
      <td>version 113 (manifest)<br><i>(API minimum 102)</i></td>
    </tr>
  </tbody>
</table>


## Beta Installation Guide
- Backup your FoxyProxy settings
- Download repo *(or use `git`)*
  - browser-extension *(this page)* -> Code *(green button)* -> Download ZIP
  - Unzip the downloaded file

- **Chrome**
  - Rename `manifest-chrome.json` in `src` folder to `manifest.json`
  - Go to `chrome://extensions/`
  - Enable Developer Mode *(top right)*
  - Click "Load Unpacked"
  - Select above `manifest.json` *(or `src` folder)*

- **Firefox** *(Nightly/Beta/Developer Edition)*
  - Rename `manifest-firefox.json` in `src` folder to `manifest.json`
  - Go to `about:debugging#/runtime/this-firefox`
  - Click "Load Temporary Add-on..."
  - Select above `manifest.json`

- **Firefox for Android**
  - Install Firefox Nightly
    - [Firefox Nightly for Developers](https://play.google.com/store/apps/details?id=org.mozilla.fenix&hl=en&gl=US)
  - Enable Debug Menu
    - Go to: menu -> Settings ->  About Firefox Nightly
    - Tap a few times on the Firefox icon to enable debug menu
    - Go to: `about:config`
    - Find `xpinstall.signatures.required`
    - Toggle to `false`
  - Install Beta version
    - Prepare `src` for Firefox as mentioned above
    - Create a zip file from the content of `src`
    - Make the file available to the Android device
  - Install add-on from file
    - Go to: menu -> Settings -> Advanced -> Install add-on from file

## Building for Distribution

### With [grunt](https://gruntjs.com/getting-started):

- Install grunt locally:
    - `npm i -D grunt-cli`
- Run one of:
  - `grunt --target=chrome-standard`<br>
  - `grunt --target=chrome-basic`<br>
  - `grunt --target=firefox-standard`<br>
  - `grunt --target=firefox-basic`

The target is built in `foxyproxy-XXX-YYY.zip`; e.g. `foxyproxy-chrome-standard.zip`.

### Without grunt:

- copy the appropriate manifest-xxx.json file to manifest.json; e.g. `mv manifest-chrome.json manifest.json`
- zip the `src` directory into the top of an archive. The `src/` directory should **not** be in the zip archive.

---

# FAQ

## 💻 Settings disappeared after the upgrade to v8

Using Firefox and you've lost all FoxyProxy settings?

FoxyProxy Basic 8.0 was first released in Sep 2023 as a trial run since it had fewer users (26k on Chrome & Firefox).
We waited for 2 months for any feedback & bug reports before releasing FoxyProxy Standard.
Unfortunately, we didn't get any bug report about the data migration sync issue, otherwise we would have fixed it before releasing the standard version.
FoxyProxy 8.2 went online on Dec 6th.
Due to a bug in version 8.2, previous settings of some users were not migrated after the upgrade.
Versions 8.3-8.6 created with fixes for the bugs immediately, but due to the AMO approval waiting time, version 8.6 came online on Dec 12th.

Previous settings were not deleted and are recoverable. The following options are available if FoxyProxy updated from 7.* and you have encountered the update bug.

<details>
  <summary><b>Retrieve Settings and Keep version 8.2</b></summary>

From [this comment](https://github.com/foxyproxy/browser-extension/issues/45#issuecomment-1838719332):

### Look for old data

1. Go to the FoxyProxy Options page
2. Open the Dev Tools (F12)
3. Go to the Console tab
4. Type the following and hit ENTER


### With Sync

```js
  browser.storage.sync.get().then(console.log)
```

If above has some data, then in the Console tab, type the following and hit ENTER

```js
browser.storage.sync.get().then(pref => {
  const data = JSON.stringify(pref, null, 2);
  const blob = new Blob([data], {type: 'application/json'});
  browser.downloads.download({
    url: URL.createObjectURL(blob),
    filename: 'FoxyProxy_sync.json',
    saveAs: true,
    conflictAction: 'uniquify'
  })
  .catch(() => {});
});
```

### Without Sync

```js
  browser.storage.local.get().then(console.log)
```

If above has some data, then in the Console tab, type the following and hit ENTER

```js
browser.storage.local.get().then(pref => {
  const data = JSON.stringify(pref, null, 2);
  const blob = new Blob([data], {type: 'application/json'});
  browser.downloads.download({
    url: URL.createObjectURL(blob),
    filename: 'FoxyProxy_local.json',
    saveAs: true,
    conflictAction: 'uniquify'
  })
  .catch(() => {});
});
```
### Import data

1. Go to **Import Tab -> Import from older versions**
2. Import the `FoxyProxy_sync.json` or `FoxyProxy_local.json` file that you have saved
3. Click SAVE to save the data
</details>

<details>
  <summary><b>Downgrade to 7.*</b></summary>

Downgrade may retrieve old settings.

1. Download 7.5.1 (or older) from https://addons.mozilla.org/firefox/addon/foxyproxy-standard/versions/
2. Click the file; firefox will ask you to install that addon. Confirm
3. Go to Firefox settings, addons (about:addons), FoxyProxy, check that it shows version 7.*
4. **Important**: On that same page, set "Allow automatic updates" to off

The settings bug is expected to be fixed in the latest release.
Check [About](https://foxyproxy.github.io/browser-extension/src/content/about.html) for more information.

</details>




## 📱 Firefox for Android

Firefox for Android ignored disabling `extensions.update.enabled` (due to a [bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1872169)). Therefore, installation of an older version from AMO will get updated. The bug is fixed in Firefox 123.

<details>
  <summary><b>Downgrade or Beta Installation</b></summary>


- Download 7.5.1 (or older) from https://addons.mozilla.org/firefox/addon/foxyproxy-standard/versions/
 - Make the file available to the Android device through [Android File Transfer](https://www.android.com/filetransfer/), adb, Android Studio, or a similar tool
- Install [Firefox Nightly for Developers](https://play.google.com/store/apps/details?id=org.mozilla.fenix&hl=en&gl=US) on Android
- Enable Debug Menu
    - Go to:` menu -> Settings ->  About Firefox Nightly`
    - Tap a few times on the Firefox icon to enable debug menu
- Navigate to: `about:config`
    - Find `xpinstall.signatures.required`
    - Toggle to `false`
    - Find (or add) `extensions.update.enabled`
    - Toggle to `false`
 - Install add-on from file
    - Go to: `menu -> Settings -> Advanced -> Install add-on from file` and select the `.zip` file you transferred to the android device
    - Check "Allow in private browsing" then "Okay, Got it"

#### See also:
- [Downgrade instructions](https://github.com/foxyproxy/browser-extension/issues/107)
- [Beta instructions](https://github.com/foxyproxy/browser-extension#beta-installation-guide)

</details>
