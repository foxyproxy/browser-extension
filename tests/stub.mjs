// ---------- WebExtension API stub ------------------------
// Minimal 'browser' namespace stub so that the extension modules
// (written for the browser) can be imported and unit-tested in Node.
//
// Requires Node >= 20.19 (or >= 22.7) for ESM syntax detection of the
// type-less .js modules under src/ (no "type": "module" in package.json
// since Gruntfile.js is CommonJS).

const noop = () => {};
const resolved = value => () => Promise.resolve(value);

globalThis.navigator ??= {
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
};

export const browser = globalThis.browser = {
  runtime: {
    getURL: () => 'moz-extension://stub/',
    getManifest: () => ({name: 'FoxyProxy'}),
    onMessage: {addListener: noop},
    sendMessage: resolved(undefined),
  },
  i18n: {getMessage: key => key},
  proxy: {
    // its presence enables the Firefox listener registration in OnRequest
    onRequest: {addListener: noop},
    settings: {get: resolved({}), set: noop, clear: noop},
  },
  tabs: {
    onUpdated: {addListener: noop},
    onRemoved: {addListener: noop},
    onCreated: {addListener: noop},
    query: resolved([]),
  },
  storage: {
    session: {get: resolved({}), set: resolved(undefined)},
    local: {get: resolved({}), set: resolved(undefined), remove: resolved(undefined), clear: resolved(undefined)},
    sync: {get: resolved({}), set: resolved(undefined), remove: resolved(undefined)},
  },
  action: {
    setBadgeBackgroundColor: noop,
    setTitle: noop,
    setBadgeText: noop,
    setIcon: noop,
  },
  extension: {isAllowedIncognitoAccess: resolved(true)},
  notifications: {create: noop},
};

// import after the stubs are in place
export async function loadOnRequest() {
  const {OnRequest} = await import('../src/content/on-request.js');
  return OnRequest;
}

export async function loadApp() {
  const {App} = await import('../src/content/app.js');
  return App;
}
