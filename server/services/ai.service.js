const cache = require("../utils/inMemoryCache");

function cacheKey(prefix, params) {
  return `${prefix}:${JSON.stringify(params)}`;
}

async function getCached(key, ttlMs) {
  return cache.get(key, ttlMs);
}

function setCache(key, value, ttlMs) {
  cache.set(key, value, ttlMs);
}

module.exports = {
  getCached,
  setCache,
  cacheKey,
};