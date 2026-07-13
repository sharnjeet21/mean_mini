// Ponytail refactor: Shrink class to lean map wrapper.
class InMemoryCache {
  constructor(defaultTtlMs = 3600000) {
    this.ttl = defaultTtlMs;
    this.store = new Map();
  }
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { this.store.delete(key); return null; }
    return entry.value;
  }
  set(key, value, ttlMs = this.ttl) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
  has(key) { return !!this.get(key); }
}
module.exports = { InMemoryCache };
