'use strict';

/**
 * Unit tests for server/middleware/rateLimiter.js
 * Uses Node.js built-in test runner (node:test) and node:assert/strict.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const RATE_LIMITER_PATH = require.resolve('../middleware/rateLimiter');

function freshRateLimiter() {
  delete require.cache[RATE_LIMITER_PATH];
  return require('../middleware/rateLimiter').rateLimiter;
}

function makeMocks(ip) {
  const req = { ip, connection: { remoteAddress: ip } };
  let nextCalled = false;
  let responseStatus = null;
  let responseBody = null;
  const headers = {};

  const res = {
    set(name, value) { headers[name] = value; return this; },
    status(code) { responseStatus = code; return this; },
    json(body) { responseBody = body; return this; },
  };
  const next = () => { nextCalled = true; };

  return {
    req, res, next,
    get nextCalled() { return nextCalled; },
    get responseStatus() { return responseStatus; },
    get responseBody() { return responseBody; },
    get headers() { return headers; },
  };
}

describe('rateLimiter — under limit', () => {
  it('59 requests from same IP all call next() and none return 429', () => {
    const rateLimiter = freshRateLimiter();
    const ip = '10.0.0.1';
    for (let i = 0; i < 59; i++) {
      const m = makeMocks(ip);
      rateLimiter(m.req, m.res, m.next);
      assert.equal(m.nextCalled, true, `Request ${i + 1} should call next()`);
      assert.equal(m.responseStatus, null, `Request ${i + 1} should not set a status`);
    }
  });
});

describe('rateLimiter — at limit', () => {
  it('exactly 60 requests all call next()', () => {
    const rateLimiter = freshRateLimiter();
    const ip = '10.0.0.2';
    for (let i = 0; i < 60; i++) {
      const m = makeMocks(ip);
      rateLimiter(m.req, m.res, m.next);
      assert.equal(m.nextCalled, true, `Request ${i + 1} should call next()`);
      assert.equal(m.responseStatus, null, `Request ${i + 1} should not return 429`);
    }
  });
});

describe('rateLimiter — over limit', () => {
  it('61st request returns 429 with Retry-After header and correct message', () => {
    const rateLimiter = freshRateLimiter();
    const ip = '10.0.0.3';
    for (let i = 0; i < 60; i++) {
      const m = makeMocks(ip);
      rateLimiter(m.req, m.res, m.next);
    }
    const m = makeMocks(ip);
    rateLimiter(m.req, m.res, m.next);
    assert.equal(m.nextCalled, false, '61st request must NOT call next()');
    assert.equal(m.responseStatus, 429, '61st request must return 429');
    assert.ok(m.headers['Retry-After'] !== undefined, '61st request must include Retry-After header');
    assert.deepEqual(m.responseBody, { message: 'Too many requests. Please wait.' });
  });
});

describe('rateLimiter — different IPs are independent', () => {
  it('60 requests from IP-A then 1 from IP-B: IP-B calls next()', () => {
    const rateLimiter = freshRateLimiter();
    const ipA = '10.0.0.4';
    const ipB = '10.0.0.5';
    for (let i = 0; i < 60; i++) {
      const m = makeMocks(ipA);
      rateLimiter(m.req, m.res, m.next);
    }
    const m = makeMocks(ipB);
    rateLimiter(m.req, m.res, m.next);
    assert.equal(m.nextCalled, true, 'IP-B request should call next()');
    assert.equal(m.responseStatus, null, 'IP-B request should not return 429');
  });
});
