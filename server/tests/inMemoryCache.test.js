'use strict';

/**
 * Unit tests for server/utils/inMemoryCache.js
 * Uses Node.js built-in test runner (node:test) and node:assert/strict.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { InMemoryCache } = require('../utils/inMemoryCache');

describe('InMemoryCache — set/get round-trip', () => {
  it('get returns the value that was set', () => {
    const cache = new InMemoryCache(60_000);
    cache.set('k', 'v');
    assert.equal(cache.get('k'), 'v');
  });
});

describe('InMemoryCache — TTL expiry', () => {
  it('get returns null after TTL expires', async () => {
    const cache = new InMemoryCache(1);
    cache.set('k', 'v', 1);
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(cache.get('k'), null, 'Expected null after TTL expiry');
  });
});

describe('InMemoryCache — hit before expiry', () => {
  it('get returns non-null value before TTL expires', () => {
    const cache = new InMemoryCache(1_000);
    cache.set('k', 'v', 1_000);
    assert.notEqual(cache.get('k'), null, 'Expected non-null before TTL expiry');
  });
});

describe('InMemoryCache — has() for missing key', () => {
  it('has() returns false when key was never set', () => {
    const cache = new InMemoryCache(60_000);
    assert.equal(cache.has('nonexistent'), false);
  });
});

describe('InMemoryCache — has() for existing key', () => {
  it('has() returns true for a key that exists and has not expired', () => {
    const cache = new InMemoryCache(60_000);
    cache.set('mykey', 'myvalue');
    assert.equal(cache.has('mykey'), true);
  });
});

describe('InMemoryCache — has() after TTL expiry', () => {
  it('has() returns false after TTL expires', async () => {
    const cache = new InMemoryCache(1);
    cache.set('k', 'v', 1);
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(cache.has('k'), false, 'Expected has() to return false after TTL expiry');
  });
});
