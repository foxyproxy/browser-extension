# FAQ

**Why is there a [CryptoJS](https://code.google.com/archive/p/crypto-js/) library in [lib](https://github.com/foxyproxy/browser-extension/tree/main/src/lib)?** *(removed in v9.0)*<br>
The CryptoJS library was already included in [FoxyProxy 3.x](https://github.com/foxyproxy/Foxyproxy_Chrome/blob/f1bca1c50dfa30908c79a9ea477f31eda2abacf4/app/scripts/stored-credentials.js#L4) to encrypt user credentials. It is needed to migrate encrypted settings from the old version (which had no updates for many years, as you mentioned). It is not used to encrypt anything; only to decrypt old data when upgrading from version 3.x to 8.x.<br>
The library is not used in Firefox, and will be removed once users migrate to v8+.

<details>
  <summary>💻 Settings disappeared after the upgrade to v8</summary>

Using Firefox and you've lost all FoxyProxy settings?

FoxyProxy Basic 8.0 was first released in Sep 2023 as a trial run since it had fewer users (26k on Chrome & Firefox).
We waited for 2 months for any feedback & bug reports before releasing FoxyProxy Standard.
Unfortunately, we didn't get any bug report about the data migration sync issue, otherwise we would have fixed it before releasing the standard version.
FoxyProxy 8.2 went online on Dec 6th.
Due to a bug in version 8.2, previous settings of some users were not migrated after the upgrade.
Versions 8.3-8.6 created with fixes for the bugs immediately, but due to the AMO approval waiting time, version 8.6 came online on Dec 12th.

Previous settings were not deleted and are recoverable. The following options are available if FoxyProxy updated from 7.* and you have encountered the update bug.
</details>

<details>
  <summary>Retrieve Settings and Keep version 8.2</summary>

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
  <summary>Downgrade to 7.*</summary>

Downgrade may retrieve old settings.

1. Download 7.5.1 (or older) from https://addons.mozilla.org/firefox/addon/foxyproxy-standard/versions/
2. Click the file; firefox will ask you to install that addon. Confirm
3. Go to Firefox settings, addons (about:addons), FoxyProxy, check that it shows version 7.*
4. **Important**: On that same page, set "Allow automatic updates" to off

The settings bug is expected to be fixed in the latest release.
Check [About](https://foxyproxy.github.io/browser-extension/src/content/about.html) for more information.

</details>




### 📱 Firefox for Android

Firefox for Android ignored disabling `extensions.update.enabled` (due to a [bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1872169)). Therefore, installation of an older version from AMO will get updated. The bug is fixed in Firefox 123.

<details>
  <summary>Downgrade or Beta Installation</summary>


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
