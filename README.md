# ![FoxyProxy](/src/image/icon.svg) FoxyProxy Browser Extension

[![license](https://img.shields.io/github/license/foxyproxy/browser-extension.svg)](https://github.com/foxyproxy/browser-extension/blob/master/LICENSE) 
![GitHub repo size](https://img.shields.io/github/repo-size/foxyproxy/browser-extension)
![Dynamic JSON Badge](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Ffoxyproxy%2Fbrowser-extension%2Fmain%2Fsrc%2Fmanifest-firefox.json&query=%24.version&prefix=v&label=FoxyProxy%20beta&color=f60)




Version 8.0+
Browser extension source code for *Firefox*, *Chrome*, and other Chromium-based browsers like *Chromium*, *Brave* and *Edge*

FoxyProxy is being updated for manifest V3.
Please post all feature requests to the [issues](https://github.com/foxyproxy/browser-extension/issues).


- [About](https://foxyproxy.github.io/browser-extension/src/content/about.html)
- [Help](https://foxyproxy.github.io/browser-extension/src/content/help.html)


## Releases

<table>
  <thead>
    <tr>
      <th></th>
      <th>Firefox</th>
      <th>Chrome</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Standard</td>
      <td>
        <a href="https://addons.mozilla.org/firefox/addon/foxyproxy-standard/"><img src="https://img.shields.io/amo/v/foxyproxy-standard" alt=""></a><br>
        <a href="https://addons.mozilla.org/firefox/addon/foxyproxy-standard/"><img src="https://img.shields.io/amo/users/foxyproxy-standard" alt=""></a>
        <a href="https://addons.mozilla.org/firefox/addon/foxyproxy-standard/"><img src="https://img.shields.io/amo/dw/foxyproxy-standard" alt=""></a>
      </td>
      <td>
        <a href="https://chromewebstore.google.com/detail/foxyproxy-standard/gcknhkkoolaabfmlnjonogaaifnjlfnp"><img src="https://img.shields.io/chrome-web-store/v/gcknhkkoolaabfmlnjonogaaifnjlfnp.svg" alt=""></a><br>
        <a href="https://chromewebstore.google.com/detail/foxyproxy-standard/gcknhkkoolaabfmlnjonogaaifnjlfnp"><img src="https://img.shields.io/chrome-web-store/users/gcknhkkoolaabfmlnjonogaaifnjlfnp" alt=""></a>
      </td>
    </tr>
    <tr>
      <td>Basic</td>
      <td>
        <a href="https://addons.mozilla.org/firefox/addon/foxyproxy-basic/"><img src="https://img.shields.io/amo/v/foxyproxy-basic.svg?color=f60" alt=""></a><br>
        <a href="https://addons.mozilla.org/firefox/addon/foxyproxy-basic/"></a><img src="https://img.shields.io/amo/users/foxyproxy-basic" alt="">
        <a href="https://addons.mozilla.org/firefox/addon/foxyproxy-basic/"></a><img src="https://img.shields.io/amo/dw/foxyproxy-basic" alt="">
      </td>
      <td>
        <a href="https://chromewebstore.google.com/detail/foxyproxy-basic/dookpfaalaaappcdneeahomimbllocnb"><img src="https://img.shields.io/chrome-web-store/v/dookpfaalaaappcdneeahomimbllocnb.svg?color=f60" alt=""></a><br>
        <a href="https://chromewebstore.google.com/detail/foxyproxy-basic/dookpfaalaaappcdneeahomimbllocnb"><img src="https://img.shields.io/chrome-web-store/users/dookpfaalaaappcdneeahomimbllocnb" alt=""></a>
      </td>
    </tr>
    <tr>
      <td>Source Code</td>
      <td><a href="https://github.com/foxyproxy/firefox-extension/">7.5.1</a></td>
      <td><a href="https://github.com/foxyproxy/Foxyproxy_Chrome">3.0.7.1</a></td>
    </tr>
  </tbody>
</table>


## Browser Minimum Versions

<table>
  <thead>
    <tr>
      <th>Firefox</th>
      <th>Chrome</th>
      <th>Firefox for Android</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>version 93<br><i>(released 2021-10-05)</i></td>
      <td>version 108<br><i>(released 2022-11-29)</i></td>
      <td>version 113 (manifest)<br><i>(API minimum 102)</i></td>
    </tr>
  </tbody>
</table>


## Installation Guide (for testing)
- Backup your FoxyProxy settings
- Download repo *(or use `git`)*
  - browser-extension *(this page)* -> Code *(green button)* -> Download ZIP
  - Unzip the downloaded file
- **Firefox** *(Nightly/Beta/Developer Edition)*
  - Rename `manifest-firefox.json` in `src` folder to `manifest.json`
  - Go to `about:debugging#/runtime/this-firefox`
  - Click "Load Temporary Add-on..."
  - Select above `manifest.json`
- **Chrome**
  - Rename `manifest-chrome.json` in `src` folder to `manifest.json`
  - Go to `chrome://extensions/`
  - Enable Developer Mode (top right)
  - Click "Load Unpacked"
  - Select above `manifest.json` (or `src` folder)

- **Firefox for Android**  
  You can try installing FoxyProxy Basic v8.*
  - [Expanded extension support in Firefox for Android Nightly](https://blog.mozilla.org/addons/2020/09/29/expanded-extension-support-in-firefox-for-android-nightly/)
  - [How to Install Any Add-on in Firefox for Android](https://www.maketecheasier.com/install-addon-firefox-android/)

## Building for Distribution
- copy the appropriate manifest-xxx.json file to manifest.json; e.g. `mv manifest-chrome.json manifest.json`
- zip using [grunt](https://stackoverflow.com/questions/15703598/how-to-install-grunt-and-how-to-build-script-with-it), which requires npm and node. Run `grunt` in top-level directory. The add-on is packaged into `target.zip`. Alternatively, zip the `src` directory into the top of an archive and exclude a bunch of stuff manually.
