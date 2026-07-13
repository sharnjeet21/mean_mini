'use strict';

/**
 * Unit tests for server/adapters/mapboxAdapter.js — MapboxProviderAdapter.geocode()
 *
 * Uses Node.js built-in test runner (node:test) and node:assert/strict.
 * fetch() is monkey-patched on `global` for each scenario so no real network
 * calls are made.
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { MapboxProviderAdapter } = require('../adapters/mapboxAdapter');
const { AdapterError } = require('../adapters/types');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Overwrite global.fetch with a stub that returns a controlled response. */
function stubFetch(handler) {
  global.fetch = handler;
}

/** Restore the original global.fetch (if it existed). */
let _originalFetch;
function saveFetch() {
  _originalFetch = global.fetch;
}
function restoreFetch() {
  global.fetch = _originalFetch;
}

/** Build a minimal valid Mapbox geocoding feature. */
function makeFeature({ placeName = 'Kyoto, Japan', center = [135.7681, 35.0116], bbox } = {}) {
  const feature = {
    place_name: placeName,
    center,
  };
  if (bbox) feature.bbox = bbox;
  return feature;
}

/** Build a minimal valid Mapbox geocoding response. */
function makeGeocodingResponse(features) {
  return { features };
}

/** Create a mock fetch that resolves with the given body. */
function mockFetchOk(body) {
  return (_url) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
    });
}

/** Create a mock fetch that resolves with a non-2xx status. */
function mockFetchError(status) {
  return (_url) =>
    Promise.resolve({
      ok: false,
      status,
      json: () => Promise.resolve({ message: 'error' }),
    });
}

/** Create a mock fetch that rejects (simulates network failure). */
function mockFetchNetworkFailure() {
  return (_url) => Promise.reject(new Error('ECONNREFUSED'));
}

/** Create a mock fetch that resolves ok but json() throws. */
function mockFetchMalformedJson() {
  return (_url) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MapboxProviderAdapter — geocode()', () => {
  let adapter;

  beforeEach(() => {
    saveFetch();
    adapter = new MapboxProviderAdapter('test_token_abc123');
  });

  afterEach(() => {
    restoreFetch();
  });

  // -------------------------------------------------------------------------
  // Task 2.2 — URL construction
  // -------------------------------------------------------------------------

  describe('Task 2.2 — URL and access token', () => {
    it('calls the correct Mapbox geocoding endpoint with access_token query param', async () => {
      let capturedUrl;
      stubFetch((url) => {
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve(
              makeGeocodingResponse([makeFeature()])
            ),
        });
      });

      await adapter.geocode('Kyoto');

      assert.ok(
        capturedUrl.startsWith(
          'https://api.mapbox.com/geocoding/v5/mapbox.places/'
        ),
        'URL should start with the Mapbox geocoding base'
      );
      assert.ok(
        capturedUrl.includes('access_token=test_token_abc123'),
        'URL should include the access token as a query param'
      );
      assert.ok(
        capturedUrl.includes('Kyoto'),
        'URL should include the encoded place name'
      );
    });

    it('URI-encodes spaces and special characters in the place name', async () => {
      let capturedUrl;
      stubFetch((url) => {
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve(
              makeGeocodingResponse([makeFeature({ placeName: 'New York, USA', center: [-74.006, 40.7128] })])
            ),
        });
      });

      await adapter.geocode('New York');

      assert.ok(
        capturedUrl.includes('New%20York'),
        'Space should be percent-encoded in the URL'
      );
    });
  });

  // -------------------------------------------------------------------------
  // Task 2.3 — Normalisation to { name, lat, lng, bbox }
  // -------------------------------------------------------------------------

  describe('Task 2.3 — Response normalisation', () => {
    it('normalises a valid Mapbox response to { name, lat, lng, bbox }', async () => {
      const feature = makeFeature({
        placeName: 'Kyoto, Japan',
        center: [135.7681, 35.0116],
        bbox: [135.5944, 34.893, 135.9187, 35.1408],
      });
      stubFetch(mockFetchOk(makeGeocodingResponse([feature])));

      const result = await adapter.geocode('Kyoto');

      assert.equal(result.name, 'Kyoto, Japan');
      assert.equal(result.lat, 35.0116);
      assert.equal(result.lng, 135.7681);
      assert.deepEqual(result.bbox, [135.5944, 34.893, 135.9187, 35.1408]);
    });

    it('extracts lat from center[1] and lng from center[0] (Mapbox [lng, lat] order)', async () => {
      const feature = makeFeature({ center: [-0.1276, 51.5074] }); // London [lng, lat]
      stubFetch(mockFetchOk(makeGeocodingResponse([feature])));

      const result = await adapter.geocode('London');

      assert.equal(result.lat, 51.5074, 'lat should be center[1]');
      assert.equal(result.lng, -0.1276, 'lng should be center[0]');
    });

    it('returns bbox as null when the feature has no bbox field', async () => {
      const feature = makeFeature(); // no bbox
      stubFetch(mockFetchOk(makeGeocodingResponse([feature])));

      const result = await adapter.geocode('Kyoto');

      assert.equal(result.bbox, null);
    });

    it('uses place_name as the name field', async () => {
      const feature = makeFeature({ placeName: 'Paris, Île-de-France, France' });
      stubFetch(mockFetchOk(makeGeocodingResponse([feature])));

      const result = await adapter.geocode('Paris');

      assert.equal(result.name, 'Paris, Île-de-France, France');
    });

    it('throws PARSE_ERROR when lat is out of range (> 90)', async () => {
      const feature = makeFeature({ center: [0, 91] }); // lat = 91, out of range
      stubFetch(mockFetchOk(makeGeocodingResponse([feature])));

      await assert.rejects(
        () => adapter.geocode('BadPlace'),
        (err) => {
          assert.ok(err instanceof AdapterError);
          assert.equal(err.code, 'PARSE_ERROR');
          return true;
        }
      );
    });

    it('throws PARSE_ERROR when lat is out of range (< -90)', async () => {
      const feature = makeFeature({ center: [0, -91] });
      stubFetch(mockFetchOk(makeGeocodingResponse([feature])));

      await assert.rejects(
        () => adapter.geocode('BadPlace'),
        (err) => {
          assert.ok(err instanceof AdapterError);
          assert.equal(err.code, 'PARSE_ERROR');
          return true;
        }
      );
    });

    it('throws PARSE_ERROR when lng is out of range (> 180)', async () => {
      const feature = makeFeature({ center: [181, 0] }); // lng = 181
      stubFetch(mockFetchOk(makeGeocodingResponse([feature])));

      await assert.rejects(
        () => adapter.geocode('BadPlace'),
        (err) => {
          assert.ok(err instanceof AdapterError);
          assert.equal(err.code, 'PARSE_ERROR');
          return true;
        }
      );
    });

    it('throws PARSE_ERROR when lng is out of range (< -180)', async () => {
      const feature = makeFeature({ center: [-181, 0] });
      stubFetch(mockFetchOk(makeGeocodingResponse([feature])));

      await assert.rejects(
        () => adapter.geocode('BadPlace'),
        (err) => {
          assert.ok(err instanceof AdapterError);
          assert.equal(err.code, 'PARSE_ERROR');
          return true;
        }
      );
    });
  });

  // -------------------------------------------------------------------------
  // Task 2.4 — NOT_FOUND on empty features
  // -------------------------------------------------------------------------

  describe('Task 2.4 — NOT_FOUND on empty features array', () => {
    it('throws AdapterError(NOT_FOUND) when features array is empty', async () => {
      stubFetch(mockFetchOk(makeGeocodingResponse([])));

      await assert.rejects(
        () => adapter.geocode('NonExistentPlace12345'),
        (err) => {
          assert.ok(err instanceof AdapterError, 'Should be AdapterError');
          assert.equal(err.code, 'NOT_FOUND');
          return true;
        }
      );
    });
  });

  // -------------------------------------------------------------------------
  // Task 2.5 — PROVIDER_ERROR on network failures / non-2xx
  // -------------------------------------------------------------------------

  describe('Task 2.5 — PROVIDER_ERROR on failures', () => {
    it('throws AdapterError(PROVIDER_ERROR) on network failure (fetch rejects)', async () => {
      stubFetch(mockFetchNetworkFailure());

      await assert.rejects(
        () => adapter.geocode('Kyoto'),
        (err) => {
          assert.ok(err instanceof AdapterError, 'Should be AdapterError');
          assert.equal(err.code, 'PROVIDER_ERROR');
          return true;
        }
      );
    });

    it('throws AdapterError(PROVIDER_ERROR) on HTTP 500', async () => {
      stubFetch(mockFetchError(500));

      await assert.rejects(
        () => adapter.geocode('Kyoto'),
        (err) => {
          assert.ok(err instanceof AdapterError);
          assert.equal(err.code, 'PROVIDER_ERROR');
          return true;
        }
      );
    });

    it('throws AdapterError(PROVIDER_ERROR) on HTTP 401 (bad token)', async () => {
      stubFetch(mockFetchError(401));

      await assert.rejects(
        () => adapter.geocode('Kyoto'),
        (err) => {
          assert.ok(err instanceof AdapterError);
          assert.equal(err.code, 'PROVIDER_ERROR');
          return true;
        }
      );
    });

    it('throws AdapterError(PROVIDER_ERROR) on HTTP 429 (rate limited)', async () => {
      stubFetch(mockFetchError(429));

      await assert.rejects(
        () => adapter.geocode('Kyoto'),
        (err) => {
          assert.ok(err instanceof AdapterError);
          assert.equal(err.code, 'PROVIDER_ERROR');
          return true;
        }
      );
    });
  });

  // -------------------------------------------------------------------------
  // Task 2.6 — PARSE_ERROR on malformed JSON / missing fields
  // -------------------------------------------------------------------------

  describe('Task 2.6 — PARSE_ERROR on malformed or unexpected responses', () => {
    it('throws AdapterError(PARSE_ERROR) when response body is not valid JSON', async () => {
      stubFetch(mockFetchMalformedJson());

      await assert.rejects(
        () => adapter.geocode('Kyoto'),
        (err) => {
          assert.ok(err instanceof AdapterError);
          assert.equal(err.code, 'PARSE_ERROR');
          return true;
        }
      );
    });

    it('throws AdapterError(PARSE_ERROR) when response has no features field', async () => {
      stubFetch(mockFetchOk({ type: 'FeatureCollection' })); // missing features

      await assert.rejects(
        () => adapter.geocode('Kyoto'),
        (err) => {
          assert.ok(err instanceof AdapterError);
          assert.equal(err.code, 'PARSE_ERROR');
          return true;
        }
      );
    });

    it('throws AdapterError(PARSE_ERROR) when features is not an array', async () => {
      stubFetch(mockFetchOk({ features: 'invalid' }));

      await assert.rejects(
        () => adapter.geocode('Kyoto'),
        (err) => {
          assert.ok(err instanceof AdapterError);
          assert.equal(err.code, 'PARSE_ERROR');
          return true;
        }
      );
    });

    it('throws AdapterError(PARSE_ERROR) when feature has no center field', async () => {
      stubFetch(
        mockFetchOk(
          makeGeocodingResponse([{ place_name: 'Nowhere', /* no center */ }])
        )
      );

      await assert.rejects(
        () => adapter.geocode('Nowhere'),
        (err) => {
          assert.ok(err instanceof AdapterError);
          assert.equal(err.code, 'PARSE_ERROR');
          return true;
        }
      );
    });

    it('throws AdapterError(PARSE_ERROR) when center array has fewer than 2 elements', async () => {
      stubFetch(
        mockFetchOk(
          makeGeocodingResponse([{ place_name: 'Nowhere', center: [135] }])
        )
      );

      await assert.rejects(
        () => adapter.geocode('Nowhere'),
        (err) => {
          assert.ok(err instanceof AdapterError);
          assert.equal(err.code, 'PARSE_ERROR');
          return true;
        }
      );
    });
  });

  // -------------------------------------------------------------------------
  // Task 2.7 — Access token never exposed
  // -------------------------------------------------------------------------

  describe('Task 2.7 — Access token never exposed in returned data or errors', () => {
    it('does not include the access token in the returned GeocodingResult', async () => {
      const secret = 'super_secret_mapbox_token';
      const localAdapter = new MapboxProviderAdapter(secret);
      const feature = makeFeature({
        placeName: 'Tokyo, Japan',
        center: [139.6917, 35.6895],
        bbox: [139.56, 35.52, 139.92, 35.82],
      });
      stubFetch(mockFetchOk(makeGeocodingResponse([feature])));

      const result = await localAdapter.geocode('Tokyo');

      const resultStr = JSON.stringify(result);
      assert.ok(
        !resultStr.includes(secret),
        'The access token must not appear in the returned GeocodingResult'
      );
    });

    it('does not include the access token in PROVIDER_ERROR message', async () => {
      const secret = 'super_secret_mapbox_token';
      const localAdapter = new MapboxProviderAdapter(secret);
      stubFetch(mockFetchNetworkFailure());

      let caughtErr;
      try {
        await localAdapter.geocode('Tokyo');
      } catch (err) {
        caughtErr = err;
      }

      assert.ok(caughtErr instanceof AdapterError);
      assert.ok(
        !caughtErr.message.includes(secret),
        'The access token must not appear in thrown error messages'
      );
    });

    it('does not include the access token in NOT_FOUND error message', async () => {
      const secret = 'super_secret_mapbox_token';
      const localAdapter = new MapboxProviderAdapter(secret);
      stubFetch(mockFetchOk(makeGeocodingResponse([])));

      let caughtErr;
      try {
        await localAdapter.geocode('NoSuchPlace');
      } catch (err) {
        caughtErr = err;
      }

      assert.ok(caughtErr instanceof AdapterError);
      assert.ok(
        !caughtErr.message.includes(secret),
        'The access token must not appear in NOT_FOUND error messages'
      );
    });

    it('does not include the access token in PARSE_ERROR message', async () => {
      const secret = 'super_secret_mapbox_token';
      const localAdapter = new MapboxProviderAdapter(secret);
      stubFetch(mockFetchOk({ features: 'not-an-array' }));

      let caughtErr;
      try {
        await localAdapter.geocode('BadPlace');
      } catch (err) {
        caughtErr = err;
      }

      assert.ok(caughtErr instanceof AdapterError);
      assert.ok(
        !caughtErr.message.includes(secret),
        'The access token must not appear in PARSE_ERROR messages'
      );
    });
  });
});
