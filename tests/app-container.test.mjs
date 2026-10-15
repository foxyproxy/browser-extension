// Unit tests for the incognito/container preference helpers (src/content/app.js)
// used by on-request.js, options.js, popup.js, menus.js, and proxy.js

import {test, describe} from 'node:test';
import assert from 'node:assert/strict';
import {loadApp} from './stub.mjs';

const App = await loadApp();

describe('App.containerHost', () => {
  test('returns legacy string as-is', () => {
    assert.equal(App.containerHost('example.com:8080'), 'example.com:8080');
  });

  test('returns the proxy of the restricted (object) format', () => {
    assert.equal(App.containerHost({proxy: 'example.com:8080', include: []}), 'example.com:8080');
  });

  test('handles empty/undefined values', () => {
    assert.equal(App.containerHost(''), '');
    assert.equal(App.containerHost(undefined), undefined);
    assert.equal(App.containerHost(null), null);
  });
});

describe('App.containerSetProxy', () => {
  test('sets a plain string for a new key', () => {
    const container = {};
    App.containerSetProxy(container, 'container-1', 'example.com:8080');
    assert.equal(container['container-1'], 'example.com:8080');
  });

  test('replaces a plain string', () => {
    const container = {'container-1': 'old.example:1'};
    App.containerSetProxy(container, 'container-1', 'new.example:2');
    assert.equal(container['container-1'], 'new.example:2');
  });

  test('keeps the patterns when the proxy of a restricted container is changed', () => {
    const include = [{type: 'wildcard', title: '', pattern: '*://*.example.com/*', active: true}];
    const container = {'container-1': {proxy: 'old.example:1', include}};
    App.containerSetProxy(container, 'container-1', 'new.example:2');
    assert.deepEqual(container['container-1'], {proxy: 'new.example:2', include});
  });

  test('clearing the proxy removes the whole entry (no stale patterns)', () => {
    const container = {'container-1': {proxy: 'old.example:1', include: [{}]}};
    App.containerSetProxy(container, 'container-1', '');
    assert.equal('container-1' in container, false);
  });
});

describe('Default preferences', () => {
  test('pref defaults keep the container object', () => {
    const db = App.getDefaultPref();
    assert.deepEqual(db.container, {});
  });
});
