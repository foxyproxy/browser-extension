# ![FoxyProxy](/src/image/icon.svg) FoxyProxy Browser Extension

[![license](https://img.shields.io/github/license/foxyproxy/browser-extension.svg)](https://github.com/foxyproxy/browser-extension/blob/master/LICENSE)
[![GitHub repo size](https://img.shields.io/github/repo-size/foxyproxy/browser-extension?logo=github&logoColor=fff)](https://github.com/foxyproxy/browser-extension)
[![ECMAScript](https://img.shields.io/badge/ECMAScript-2022_(ES13)-blue?logo=javascript)](https://262.ecma-international.org/13.0/index.html)



[About (Changelog)](https://foxyproxy.github.io/browser-extension/src/content/about.html) | [Help](https://foxyproxy.github.io/browser-extension/src/content/help.html) | [Issues](https://github.com/foxyproxy/browser-extension/issues)

After some years of stability, FoxyProxy has been updated to support Manifest Version 3 which is required by Chrome in order for extensions to be compatible with Chrome in 2024. We took advantage of this forced update to implement many feature requests and other changes that were requested over the years.

FoxyProxy has been owned and developed consistently by the same team since 2006.

The repository has the source code for version 8.0+  for *Firefox*, *Chrome*, and other Chromium-based browsers like *Chromium*, *Brave* and *Edge*.   
Source code for [older versions](https://github.com/foxyproxy/firefox-extension).

## Permissions

<dl>
  <dt>downloads</dt>
  <dd>Used to save/export user preferences to file, for backup or sharing</dd>
  <dt>notifications</dt>
  <dd>Used to inform users (e.g. for errors)</dd>
  <dt>proxy</dt>
  <dd>Used to set proxies (core function of the extension)</dd>
  <dt>storage</dt>
  <dd>Used to store user preferences</dd>
  <dt>tabs</dt>
  <dd>Used to get tab details (e.g. for "Quick Add", "Tab Proxy", & "Incognito/Container Proxy")</dd>
  <dt>webRequest</dt>
  <dd>Used to provide proxy authentication</dd>
  <dt>webRequestAuthProvider</dt>
  <dd>Used to provide proxy authentication</dd>
  <dt>host permission</dt>
  <dd>Used to provide proxy authentication (to any URL `"<all_urls>"`)</dd>
</dl>


### Optional Permissions

<dl>
  <dt>browsingData</dt>
  <dd>Used for "Delete Browsing Data" button to delete cookies, indexedDB, and localStorage, only if requested by the user</dd>
  <dt>privacy</dt>
  <dd>Used for "Limit WebRTC" button to toggle `browser.privacy.network.webRTCIPHandlingPolicy`, only if requested by the user</dd>
</dl>

### Remote Code
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
        <a href="https://chromewebstore.google.com/detail/foxyproxy-standard/gcknhkkoolaabfmlnjonogaaifnjlfnp"><img src="https://img.shields.io/chrome-web-store/v/gcknhkkoolaabfmlnjonogaaifnjlfnp?logo=googlechrome&logoColor=fff&label=Chrome" alt=""></a><br>
        <a href="https://chromewebstore.google.com/detail/foxyproxy-standard/gcknhkkoolaabfmlnjonogaaifnjlfnp"><img src="https://img.shields.io/chrome-web-store/users/gcknhkkoolaabfmlnjonogaaifnjlfnp" alt=""></a>
      </td>
      <td>
        <a href="https://addons.mozilla.org/firefox/addon/foxyproxy-standard/"><img src="https://img.shields.io/amo/v/foxyproxy-standard?logo=firefoxbrowser&logoColor=fff&label=Firefox" alt=""></a>
        <a href="https://support.mozilla.org/kb/add-on-badges#w_recommended-extensions"><img src="/screenshots/recommended.png" width="105" alt=""></a><br>
        <a href="https://addons.mozilla.org/firefox/addon/foxyproxy-standard/"><img src="https://img.shields.io/amo/users/foxyproxy-standard" alt=""></a>
        <a href="https://addons.mozilla.org/firefox/addon/foxyproxy-standard/"><img src="https://img.shields.io/amo/dw/foxyproxy-standard" alt=""></a>
      </td>
      <td>
       <a href="https://microsoftedge.microsoft.com/addons/detail/foxyproxy/flcnoalcefgkhkinjkffipfdhglnpnem"><img src="https://img.shields.io/badge/dynamic/json?label=Edge&prefix=v&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fflcnoalcefgkhkinjkffipfdhglnpnem" alt=""></a><br>
       <a href="https://microsoftedge.microsoft.com/addons/detail/foxyproxy/flcnoalcefgkhkinjkffipfdhglnpnem"><img src="https://img.shields.io/badge/dynamic/json?label=users&query=%24.activeInstallCount&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fflcnoalcefgkhkinjkffipfdhglnpnem" alt=""></a>
       <a href="https://microsoftedge.microsoft.com/addons/detail/foxyproxy/flcnoalcefgkhkinjkffipfdhglnpnem"><img src="https://img.shields.io/badge/dynamic/json?label=rating&suffix=/5&query=%24.averageRating&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fflcnoalcefgkhkinjkffipfdhglnpnem" alt=""></a>
      </td>
    </tr>
    <tr>
      <td>Basic</td>
      <td>
        <a href="https://chromewebstore.google.com/detail/foxyproxy-basic/dookpfaalaaappcdneeahomimbllocnb"><img src="https://img.shields.io/chrome-web-store/v/dookpfaalaaappcdneeahomimbllocnb?logo=googlechrome&logoColor=fff&label=Chrome" alt=""></a><br>
        <a href="https://chromewebstore.google.com/detail/foxyproxy-basic/dookpfaalaaappcdneeahomimbllocnb"><img src="https://img.shields.io/chrome-web-store/users/dookpfaalaaappcdneeahomimbllocnb" alt=""></a>
      </td>
      <td>
        <a href="https://addons.mozilla.org/firefox/addon/foxyproxy-basic/"><img src="https://img.shields.io/amo/v/foxyproxy-basic?logo=firefoxbrowser&logoColor=fff&label=Firefox" alt=""></a><br>
        <a href="https://addons.mozilla.org/firefox/addon/foxyproxy-basic/"></a><img src="https://img.shields.io/amo/users/foxyproxy-basic" alt="">
        <a href="https://addons.mozilla.org/firefox/addon/foxyproxy-basic/"></a><img src="https://img.shields.io/amo/dw/foxyproxy-basic" alt="">
      </td>
      <td></td>
    </tr>
  </tbody>
</table>

### Source Code

<table>
  <thead>
    <tr>
      <th>Beta</th>
      <th>Release</th>
      <th colspan="2">Old</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="https://github.com/foxyproxy/browser-extension/tree/main/src"><img src="https://img.shields.io/badge/dynamic/json?&url=https%3A%2F%2Fraw.githubusercontent.com%2Ffoxyproxy%2Fbrowser-extension%2Fmain%2Fsrc%2Fmanifest.json&query=%24.version&logo=github&logoColor=fff&label=FoxyProxy%20Beta&color=f60&prefix=v" alt=""></a></td>
      <td><a href="https://github.com/foxyproxy/browser-extension/releases">Releases</a></td>
      <td><a href="https://github.com/foxyproxy/Foxyproxy_Chrome">3.0.7.1</a></td>
      <td><a href="https://github.com/foxyproxy/firefox-extension/">7.5.1</a></td>
    </tr>
  </tbody>
</table>


### Browser Minimum

<table>
  <thead>
    <tr>
      <th>version</th>
      <th>Chrome/Edge</th>
      <th>Firefox</th>
      <th>Firefox for Android</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>8.0 - 8.10</td>
      <td>version 108<br><i>(released 2022-11-29)</i></td>
      <td>version 93<br><i>(released 2021-10-05)</i></td>
      <td>version 113 (manifest)<br><i>(API minimum 102)</i></td>
    </tr>
    <tr>
      <td>9.0 - *</td>
      <td>version 108<br><i>(released 2022-11-29)</i></td>
      <td>version 128<br><i>(released 2024-07-09)</i><br><i>due to root certificate expiry</i><br><i>2025-03-14</i></td>
      <td>version 128<br><i>(released 2024-07-09)</i><br><i>due to root certificate expiry</i><br><i>2025-03-14</i></td>
    </tr>
  </tbody>
</table>


## Beta Installation Guide
- Backup your FoxyProxy settings
- Download repo *(or use `git`)*
  - browser-extension *(this page)* -> Code *(green button)* -> Download ZIP
  - Unzip the downloaded file

- **Chrome**
  - Go to `chrome://extensions/`
  - Enable Developer Mode *(top right)*
  - Click "Load Unpacked"
  - Select `manifest.json` *(or `src` folder)*

- **Firefox** *(Nightly/Beta/Developer Edition)*
  - Go to `about:debugging#/runtime/this-firefox`
  - Click "Load Temporary Add-on..."
  - Select `manifest.json`

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

## Building for Distribution on the Chrome, Edge, and Firefox web stores

### Version 9.0 and above
- FoxyProxy Standard: remove `manifes-basic.json`
- FoxyProxy Baisc: remove `manifes.json`, and rename `manifes-basic.json` to `manifes.json`
- zip the contents of the `src` directory into the top of an archive.  
  The `src/` directory should **not** be in the zip archive.

###  Version 8.0 to 8.10: without grunt:

- copy the appropriate manifest-xxx.json file to manifest.json; e.g. `mv manifest-chrome.json manifest.json`
- zip the contents of the `src` directory into the top of an archive.  
  The `src/` directory should **not** be in the zip archive.

### Version 8.0 to 8.10: with [grunt](https://gruntjs.com/getting-started):

- Install grunt locally:
    - `npm i -D grunt-cli`
- Run one of:
  - `grunt --target=chrome-standard`
  - `grunt --target=chrome-basic`
  - `grunt --target=firefox-standard`
  - `grunt --target=firefox-basic`

The target is built in `foxyproxy-XXX-YYY.zip`; e.g. `foxyproxy-chrome-standard.zip`.
