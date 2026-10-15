// Unit tests for the Firefox proxy.onRequest routing (src/content/on-request.js)
// Focus: container-scoped proxy by patterns ("Only matching URLs" mode)
// Run: npm test  (requires Node >= 20.19 for ESM syntax detection of src/*.js)

import {test, describe, beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {loadOnRequest} from './stub.mjs';

const OnRequest = await loadOnRequest();

// ---------- fixtures -------------------------------------
const NORWAY_HOST = 'no.residential.example';
const NORWAY = `${NORWAY_HOST}:1080`;

const makeProxy = (over = {}) => ({
  active: true,
  title: 'Residential-Norway',
  type: 'socks5',
  hostname: NORWAY_HOST,
  port: '1080',
  username: '',
  password: '',
  cc: 'NO',
  city: 'Oslo',
  color: '#ff9900',
  pac: '',
  pacString: '',
  proxyDNS: true,
  include: [],
  exclude: [],
  tabProxy: [],
  ...over,
});

const pat = (pattern, type = 'wildcard', over = {}) => ({active: true, title: '', pattern, type, ...over});

// illustrative allowlist (arbitrary domains, nothing hard-coded in the source)
const redditAllowlist = () => [
  pat('*://reddit.com/*'),
  pat('*://*.reddit.com/*'),
  pat('*://redd.it/*'),
  pat('*://*.redd.it/*'),
  pat('*://redditmedia.com/*'),
  pat('*://*.redditmedia.com/*'),
  pat('*://redditstatic.com/*'),
  pat('*://*.redditstatic.com/*'),
  pat('*://w3-reporting.reddit.com/*'),
  pat('*://pi.reddit.com/*'),
  pat('https://challenges.cloudflare.com/*'),
];

const restricted = (proxy = NORWAY, include = redditAllowlist()) => ({proxy, include});

const basePref = (over = {}) => ({
  mode: 'disable',
  sync: false,
  autoBackup: false,
  passthrough: '',
  theme: '',
  container: {},
  commands: {},
  data: [],
  ...over,
});

// proxy.onRequest event (tabId -1: not from a tab -> no session storage/badge side effects)
const req = (url, over = {}) => ({url, method: 'GET', type: 'main_frame', tabId: -1, incognito: false, ...over});

const C1 = {cookieStoreId: 'firefox-container-1'};
const C2 = {cookieStoreId: 'firefox-container-2'};
const DEFAULT = {cookieStoreId: 'firefox-default'};

const isDirect = r => assert.deepEqual(r, {type: 'direct'});
const isNorway = r => {
  assert.equal(r.host, NORWAY_HOST);
  assert.equal(r.port, 1080);
  // API uses socks for socks5
  assert.equal(r.type, 'socks');
  assert.equal(r.proxyDNS, true);
};

beforeEach(() => {
  // reset session-mirrored caches
  OnRequest.tabProxy = {};
  OnRequest.tabProxyPattern = {};
});

// ---------- restricted mode (Only matching URLs) ---------
describe('Container proxy restricted to matching URLs', () => {

  test('matching URL in the configured container uses the assigned proxy', () => {
    OnRequest.init(basePref({
      data: [makeProxy()],
      container: {'container-1': restricted()},
    }));

    isNorway(OnRequest.process(req('https://www.reddit.com/r/firefox/', C1)));
    isNorway(OnRequest.process(req('https://reddit.com/', C1)));
    isNorway(OnRequest.process(req('https://redd.it/abc', C1)));
    isNorway(OnRequest.process(req('https://w3-reporting.reddit.com/x', C1)));
    isNorway(OnRequest.process(req('https://challenges.cloudflare.com/cdn-cgi/challenge', C1)));
  });

  test('nonmatching URL in the configured container goes DIRECT (no fallback to the assigned proxy)', () => {
    OnRequest.init(basePref({
      data: [makeProxy()],
      container: {'container-1': restricted()},
    }));

    isDirect(OnRequest.process(req('https://example.com/', C1)));
    // third-party ad/analytics style URL
    isDirect(OnRequest.process(req('https://ads.tracker.example/banner.js', C1)));
    // new, previously unlisted domain
    isDirect(OnRequest.process(req('https://brand-new-domain.example/', C1)));
  });

  test('matching URL in an unrelated container is NOT routed through the container proxy', () => {
    OnRequest.init(basePref({
      data: [makeProxy()],
      container: {'container-1': restricted()},
    }));

    // container-2 has no assignment and mode is disable -> DIRECT
    isDirect(OnRequest.process(req('https://www.reddit.com/', C2)));
  });

  test('nonmatching URL in an unrelated container keeps the existing behavior', () => {
    const global = makeProxy({title: 'Global', type: 'http', hostname: 'global.example', port: '8080', cc: ''});
    // single proxy mode still applies to containers without assignment
    OnRequest.init(basePref({
      mode: 'global.example:8080',
      data: [makeProxy(), global],
      container: {'container-1': restricted()},
    }));

    const r = OnRequest.process(req('https://example.com/', C2));
    assert.equal(r.host, 'global.example');
    assert.equal(r.port, 8080);
  });

  test('restricted mode with an empty pattern list -> DIRECT for all URLs', () => {
    OnRequest.init(basePref({
      data: [makeProxy()],
      container: {'container-1': restricted(NORWAY, [])},
    }));

    isDirect(OnRequest.process(req('https://www.reddit.com/', C1)));
    isDirect(OnRequest.process(req('https://example.com/', C1)));
  });

  test('restricted mode without include property -> DIRECT (fail closed)', () => {
    OnRequest.init(basePref({
      data: [makeProxy()],
      container: {'container-1': {proxy: NORWAY}},
    }));

    isDirect(OnRequest.process(req('https://www.reddit.com/', C1)));
  });

  test('adding a new pattern to the allowlist enables proxying for that domain', () => {
    const data = [makeProxy()];
    OnRequest.init(basePref({data, container: {'container-1': restricted()}}));
    isDirect(OnRequest.process(req('https://newsite.example/', C1)));

    // user adds a new pattern
    OnRequest.init(basePref({
      data,
      container: {'container-1': restricted(NORWAY, [...redditAllowlist(), pat('*://newsite.example/*')])},
    }));
    isNorway(OnRequest.process(req('https://newsite.example/', C1)));
    // other URLs still DIRECT
    isDirect(OnRequest.process(req('https://example.com/', C1)));
  });

  test('inactive patterns are ignored (fail closed)', () => {
    OnRequest.init(basePref({
      data: [makeProxy()],
      container: {'container-1': restricted(NORWAY, [pat('*://*.reddit.com/*', 'wildcard', {active: false})])},
    }));

    isDirect(OnRequest.process(req('https://www.reddit.com/', C1)));
  });

  test('invalid regex pattern is dropped and never throws (fail closed)', () => {
    OnRequest.init(basePref({
      data: [makeProxy()],
      container: {'container-1': restricted(NORWAY, [pat('([unclosed', 'regex'), pat('*://*.reddit.com/*')])},
    }));

    // the invalid pattern does not break processing
    isDirect(OnRequest.process(req('https://example.com/', C1)));
    // the valid pattern still works
    isNorway(OnRequest.process(req('https://www.reddit.com/', C1)));
  });

  test('match type patterns are supported', () => {
    OnRequest.init(basePref({
      data: [makeProxy()],
      container: {'container-1': restricted(NORWAY, [pat('*://*.matchtype.example/*', 'match')])},
    }));

    isNorway(OnRequest.process(req('https://a.matchtype.example/x', C1)));
    isNorway(OnRequest.process(req('https://matchtype.example/', C1)));
    // unrelated host -> DIRECT
    isDirect(OnRequest.process(req('https://other.example/x', C1)));
  });

  test('incognito can be restricted to matching URLs', () => {
    OnRequest.init(basePref({
      data: [makeProxy()],
      container: {incognito: restricted()},
    }));

    const priv = {incognito: true, cookieStoreId: 'firefox-private'};
    isNorway(OnRequest.process(req('https://www.reddit.com/', priv)));
    isDirect(OnRequest.process(req('https://example.com/', priv)));
  });

  test('default container can be restricted to matching URLs', () => {
    OnRequest.init(basePref({
      data: [makeProxy()],
      container: {default: restricted()},
    }));

    isNorway(OnRequest.process(req('https://www.reddit.com/', DEFAULT)));
    isDirect(OnRequest.process(req('https://example.com/', DEFAULT)));
  });

  test('the same proxy can be assigned to another container with a different mode', () => {
    OnRequest.init(basePref({
      data: [makeProxy()],
      container: {
        'container-1': restricted(),
        // same proxy, All URLs mode
        'container-2': NORWAY,
      },
    }));

    // container-1: allowlist enforced
    isNorway(OnRequest.process(req('https://www.reddit.com/', C1)));
    isDirect(OnRequest.process(req('https://example.com/', C1)));
    // container-2: every URL is proxied, unaffected by container-1 patterns
    isNorway(OnRequest.process(req('https://example.com/', C2)));
    isNorway(OnRequest.process(req('https://www.reddit.com/', C2)));
  });

  test('init does not mutate the proxy data in pref', () => {
    const global = makeProxy({include: [pat('*://*.probedomain.example/*')]});
    const pref = basePref({data: [global], container: {'container-1': restricted()}});
    OnRequest.init(pref);

    // the compiled container allowlist is kept on a copy, pref.data stays intact
    assert.equal('containerInclude' in pref.data[0], false);
    assert.equal(pref.data[0].include.length, 1);
    assert.equal(pref.data[0].include[0].pattern, '*://*.probedomain.example/*');
  });
});

// ---------- existing behavior (All URLs / legacy) --------
describe('Existing container behavior is preserved', () => {

  test('legacy string assignment proxies all URLs in the container', () => {
    OnRequest.init(basePref({
      data: [makeProxy()],
      container: {'container-1': NORWAY},
    }));

    isNorway(OnRequest.process(req('https://www.reddit.com/', C1)));
    isNorway(OnRequest.process(req('https://example.com/', C1)));
    isNorway(OnRequest.process(req('https://anything.else.example/x', C1)));
  });

  test('settings without the container property (backward compatible)', () => {
    const pref = basePref({data: [makeProxy()]});
    delete pref.container;
    OnRequest.init(pref);

    isDirect(OnRequest.process(req('https://www.reddit.com/', C1)));
  });

  test('default container legacy string assignment applies to normal tabs', () => {
    OnRequest.init(basePref({
      data: [makeProxy()],
      container: {default: NORWAY},
    }));

    isNorway(OnRequest.process(req('https://example.com/', DEFAULT)));
  });

  test('assignment to a deleted/disabled/PAC proxy is ignored', () => {
    const pac = makeProxy({title: 'PAC', type: 'pac', hostname: '', port: '', pac: 'https://pac.example/pac'});
    OnRequest.init(basePref({
      data: [pac],
      container: {'container-1': 'https://pac.example/pac'},
    }));

    isDirect(OnRequest.process(req('https://example.com/', C1)));

    // disabled proxy
    OnRequest.init(basePref({
      data: [makeProxy({active: false})],
      container: {'container-1': NORWAY},
    }));
    isDirect(OnRequest.process(req('https://example.com/', C1)));
  });
});

// ---------- interaction with other mechanisms ------------
describe('Interaction with existing routing mechanisms', () => {

  test('global exclusion (passthrough) wins over the container allowlist', () => {
    OnRequest.init(basePref({
      passthrough: '*.reddit.com',
      data: [makeProxy()],
      container: {'container-1': restricted()},
    }));

    // matches the allowlist but also the global exclude -> DIRECT
    isDirect(OnRequest.process(req('https://www.reddit.com/', C1)));
    // not excluded, matches allowlist -> proxy
    isNorway(OnRequest.process(req('https://challenges.cloudflare.com/x', C1)));
  });

  test('Tab Proxy has priority over the restricted container proxy', () => {
    const tab = makeProxy({title: 'Tab', type: 'http', hostname: 'tab.example', port: '8080', cc: ''});
    OnRequest.init(basePref({
      data: [makeProxy(), tab],
      container: {'container-1': restricted()},
    }));

    OnRequest.tabProxy[7] = tab;
    // nonmatching URL: tab proxy still applies (higher priority)
    const r1 = OnRequest.process(req('https://example.com/', {tabId: 7, ...C1}));
    assert.equal(r1.host, 'tab.example');
    // matching URL: tab proxy wins over the container proxy
    const r2 = OnRequest.process(req('https://www.reddit.com/', {tabId: 7, ...C1}));
    assert.equal(r2.host, 'tab.example');
  });

  test('Tab Proxy by patterns has priority over the restricted container proxy', () => {
    const tab = makeProxy({title: 'Tab', type: 'http', hostname: 'tab.example', port: '8080', cc: ''});
    OnRequest.init(basePref({
      data: [makeProxy(), tab],
      container: {'container-1': restricted()},
    }));

    OnRequest.tabProxyPattern[7] = tab;
    // sub_frame: avoids the main_frame tabProxyPattern recomputation
    const r = OnRequest.process(req('https://example.com/', {tabId: 7, type: 'sub_frame', ...C1}));
    assert.equal(r.host, 'tab.example');
  });

  test('the container allowlist does not become a global pattern rule', () => {
    // same proxy is independently configured in global Proxy by Patterns
    const shared = makeProxy({include: [pat('*://*.probedomain.example/*')]});
    OnRequest.init(basePref({
      mode: 'pattern',
      data: [shared],
      container: {'container-1': restricted()},
    }));

    // other container: global pattern still applies, container allowlist does not leak
    const r1 = OnRequest.process(req('https://x.probedomain.example/', C2));
    assert.equal(r1.host, NORWAY_HOST);
    // other container: reddit matches only the container-1 allowlist -> DIRECT
    isDirect(OnRequest.process(req('https://www.reddit.com/', C2)));

    // normal tab: reddit matches only the container-1 allowlist -> DIRECT (global rules unchanged)
    isDirect(OnRequest.process(req('https://www.reddit.com/', DEFAULT)));
    // normal tab: global pattern still applies
    const r2 = OnRequest.process(req('https://x.probedomain.example/', DEFAULT));
    assert.equal(r2.host, NORWAY_HOST);

    // inside the restricted container: the allowlist replaces standard processing
    isNorway(OnRequest.process(req('https://www.reddit.com/', C1)));
    // unmatched -> DIRECT even though a global pattern would match
    isDirect(OnRequest.process(req('https://x.probedomain.example/', C1)));
  });

  test('matching URL in a normal tab keeps the existing single-proxy mode behavior', () => {
    const global = makeProxy({title: 'Global', type: 'http', hostname: 'global.example', port: '8080', cc: ''});
    OnRequest.init(basePref({
      mode: 'global.example:8080',
      data: [makeProxy(), global],
      container: {'container-1': restricted()},
    }));

    const r = OnRequest.process(req('https://www.reddit.com/', DEFAULT));
    assert.equal(r.host, 'global.example');
  });
});

// ---------- export/import --------------------------------
describe('Export/Import', () => {

  test('restricted container settings survive a JSON round trip', () => {
    const pref = basePref({data: [makeProxy()], container: {'container-1': restricted()}});
    OnRequest.init(pref);
    isNorway(OnRequest.process(req('https://www.reddit.com/', C1)));

    // export -> import
    const imported = JSON.parse(JSON.stringify(pref));
    assert.equal(imported.container['container-1'].proxy, NORWAY);
    assert.equal(imported.container['container-1'].include.length, redditAllowlist().length);

    OnRequest.init(imported);
    isNorway(OnRequest.process(req('https://www.reddit.com/', C1)));
    isDirect(OnRequest.process(req('https://example.com/', C1)));
  });
});
