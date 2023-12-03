# ![FoxyProxy](/src/image/icon.svg) FoxyProxy Browser Extension

[![license](https://img.shields.io/github/license/foxyproxy/browser-extension.svg)](https://github.com/foxyproxy/browser-extension/blob/master/LICENSE) 
![GitHub repo size](https://img.shields.io/github/repo-size/foxyproxy/browser-extension)

[About](https://foxyproxy.github.io/browser-extension/src/content/about.html) | [Help](https://foxyproxy.github.io/browser-extension/src/content/help.html) | [Issues](https://github.com/foxyproxy/browser-extension/issues)

Version 8.0+ Browser extension source code for *Firefox*, *Chrome*, and other Chromium-based browsers like *Chromium*, *Brave* and *Edge*
Please post all feature requests and bugs to issues.


## Screenshots

### Dark Theme

<img src="/screenshots/8.1/dark-theme/popup.jpg" width="200" alt=""> <img src="/screenshots/8.1/dark-theme/options-tab.jpg" width="200" alt=""> 
<img src="/screenshots/8.1/dark-theme/proxies-tab.jpg" width="200" alt="">

<img src="/screenshots/8.1/dark-theme/import-tab.jpg" width="200" alt=""> <img src="/screenshots/8.1/dark-theme/pattern-tester-tab.jpg" width="200" alt=""> 
<img src="/screenshots/8.1/dark-theme/log-tab.jpg" width="200" alt="">

### Light Theme

<img src="/screenshots/8.1/light-theme/popup.jpg" width="200" alt=""> <img src="/screenshots/8.1/light-theme/options-tab.jpg" width="200" alt="">
<img src="/screenshots/8.1/light-theme/proxies-tab.jpg" width="200" alt="">

<img src="/screenshots/8.1/light-theme/import-tab.jpg" width="200" alt=""> <img src="/screenshots/8.1/light-theme/pattern-tester-tab.jpg" width="200" alt="">
<img src="/screenshots/8.1/light-theme/log-tab.jpg" width="200" alt="">

## Releases

<table>
  <thead>
    <tr>
      <th></th>
      <th>Chrome</th>
      <th>Firefox</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Standard</td>
      <td>
        <a href="https://chromewebstore.google.com/detail/foxyproxy-standard/gcknhkkoolaabfmlnjonogaaifnjlfnp"><img src="https://img.shields.io/chrome-web-store/v/gcknhkkoolaabfmlnjonogaaifnjlfnp.svg" alt=""></a><br>
        <a href="https://chromewebstore.google.com/detail/foxyproxy-standard/gcknhkkoolaabfmlnjonogaaifnjlfnp"><img src="https://img.shields.io/chrome-web-store/users/gcknhkkoolaabfmlnjonogaaifnjlfnp" alt=""></a>
      </td>
      <td>
        <a href="https://addons.mozilla.org/firefox/addon/foxyproxy-standard/"><img src="https://img.shields.io/amo/v/foxyproxy-standard" alt=""></a><br>
        <a href="https://addons.mozilla.org/firefox/addon/foxyproxy-standard/"><img src="https://img.shields.io/amo/users/foxyproxy-standard" alt=""></a>
        <a href="https://addons.mozilla.org/firefox/addon/foxyproxy-standard/"><img src="https://img.shields.io/amo/dw/foxyproxy-standard" alt=""></a>
      </td>
    </tr>
    <tr>
      <td>Basic</td>
      <td>
        <a href="https://chromewebstore.google.com/detail/foxyproxy-basic/dookpfaalaaappcdneeahomimbllocnb"><img src="https://img.shields.io/chrome-web-store/v/dookpfaalaaappcdneeahomimbllocnb.svg?color=f60" alt=""></a><br>
        <a href="https://chromewebstore.google.com/detail/foxyproxy-basic/dookpfaalaaappcdneeahomimbllocnb"><img src="https://img.shields.io/chrome-web-store/users/dookpfaalaaappcdneeahomimbllocnb" alt=""></a>
      </td>
      <td>
        <a href="https://addons.mozilla.org/firefox/addon/foxyproxy-basic/"><img src="https://img.shields.io/amo/v/foxyproxy-basic.svg?color=f60" alt=""></a><br>
        <a href="https://addons.mozilla.org/firefox/addon/foxyproxy-basic/"></a><img src="https://img.shields.io/amo/users/foxyproxy-basic" alt="">
        <a href="https://addons.mozilla.org/firefox/addon/foxyproxy-basic/"></a><img src="https://img.shields.io/amo/dw/foxyproxy-basic" alt="">
      </td>
    </tr>
    <tr>
      <td>Source Code Beta</td>
      <td colspan="2"><a href="https://github.com/foxyproxy/browser-extension/tree/main/src"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Ffoxyproxy%2Fbrowser-extension%2Fmain%2Fsrc%2Fmanifest-firefox.json&query=%24.version&prefix=v&label=FoxyProxy%20beta&color=f60" alt=""></a></td>
    </tr>
    <tr>
      <td>Source Code Release</td>
      <td colspan="2"><a href="https://github.com/foxyproxy/browser-extension/releases/tag/v8.1">8.1</a></td>
    </tr>
    <tr>
      <td>Source Code Old</td>
      <td><a href="https://github.com/foxyproxy/Foxyproxy_Chrome">3.0.7.1</a></td>
      <td><a href="https://github.com/foxyproxy/firefox-extension/">7.5.1</a></td>
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


## Installation Guide (for testing)
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
  You can try installing FoxyProxy Basic v8.*
  - [Expanded extension support in Firefox for Android Nightly](https://blog.mozilla.org/addons/2020/09/29/expanded-extension-support-in-firefox-for-android-nightly/)
  - [How to Install Any Add-on in Firefox for Android](https://www.maketecheasier.com/install-addon-firefox-android/)

## Building for Distribution

### With [grunt](https://gruntjs.com/getting-started):

1. Install grunt locally:

`npm i -D grunt-cli`

2. Run one of:

`grunt --target=chrome-standard`<br>
`grunt --target=chrome-basic`<br>
`grunt --target=firefox-standard`<br>
`grunt --target=firefox-basic`

The target is built in `foxyproxy-XXX-YYY.zip`; e.g. `foxyproxy-chrome-standard.zip`.

### Without grunt:

- copy the appropriate manifest-xxx.json file to manifest.json; e.g. `mv manifest-chrome.json manifest.json`
- zip the `src` directory into the top of an archive. The `src/` directory should **not** be in the zip archive.
