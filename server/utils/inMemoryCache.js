/**
 * InMemoryCache — a simple TTL-based in-memory cache backed by a Map.
 *
 * Each entry stores the value alongside an expiry timestamp so that
 * stale entries are never returned, even if they haven't been evicted yet.
 *
 * Typical TTL defaults used by callers:
 *   - image / suggestions        → 1 hour  (3_600_000 ms)
 *   - trending destinations      → 24 hours (86_400_000 ms)
 *   - itinerary-suggestions      → 1 hour  (3_600_000 ms)
 */
class InMemoryCache {
  /**
   * @param {number} defaultTtlMs - Default time-to-live in milliseconds.
   */
  constructor(defaultTtlMs) {
    this._defaultTtlMs = defaultTtlMs;
    /** @type {Map<string, {value: *, expiresAt: number}>} */
    this._store = new Map();
  }

  /**
   * Retrieve a cached value by key.
   * Returns null if the key does not exist or the entry has expired.
   *
   * @param {string} key
   * @returns {*|null}
   */
  get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      // Evict the stale entry eagerly
      this._store.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Store a value under the given key with an optional TTL override.
   *
   * @param {string} key
   * @param {*} value
   * @param {number} [ttlMs] - TTL in milliseconds; falls back to defaultTtlMs.
   */
  set(key, value, ttlMs) {
    const ttl = typeof ttlMs === 'number' ? ttlMs : this._defaultTtlMs;
    this._store.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Check whether a non-expired entry exists for the given key.
   *
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    const entry = this._store.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return false;
    }

    return true;
  }
}

module.exports = { InMemoryCache };
