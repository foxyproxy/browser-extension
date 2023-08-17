# ![FoxyProxy](/src/image/icon.svg) FoxyProxy Browser Extension
Version 8.0+  
Browser extension source code for *Firefox*, *Chrome*, and other Chromium-based browsers like *Chromium*, *Brave* and *Edge*

FoxyProxy is being updated for manifest V3. The current source is **beta** for **beta-testing only**.
- Chrome minimum version 108
- Firefox minimum version 93

Please post all feature requests to the [issues](https://github.com/foxyproxy/browser-extension/issues).


- [About](https://foxyproxy.github.io/browser-extension/src/content/about.html)
- [Help](https://foxyproxy.github.io/browser-extension/src/content/help.html)


### Previous Versions

### Firefox
- Extension: [FoxyProxy Standard](https://addons.mozilla.org/firefox/addon/foxyproxy-standard/)
- Extension: [FoxyProxy Basic](https://addons.mozilla.org/firefox/addon/foxyproxy-basic/)
- Source Code: [Firefox Extension 7.5](https://github.com/foxyproxy/firefox-extension)

#### Chrome
- Extension: [FoxyProxy Standard](https://chrome.google.com/webstore/detail/foxyproxy-standard/gcknhkkoolaabfmlnjonogaaifnjlfnp)
- Extension: [FoxyProxy Basic](https://chrome.google.com/webstore/detail/foxyproxy-basic/dookpfaalaaappcdneeahomimbllocnb)
- Source Code: [Chrome Extension 3.0](https://github.com/foxyproxy/Foxyproxy_Chrome)


### Installation Guide (for testing)
- Backup your FoxyProxy settings
- Download repo (or use `git)
  - [browser-extension](https://github.com/foxyproxy/browser-extension) -> Code (green button) -> Download ZIP
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
