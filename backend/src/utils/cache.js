import NodeCache from 'node-cache';

const memoryCache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

export async function getCached(cache, key) {
  if (cache) {
    try {
      const value = await cache.get(key);
      if (value) {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
    } catch {
      // Fall back to process memory cache when Redis is unavailable.
    }
  }
  return memoryCache.get(key) ?? null;
}

export async function setCached(cache, key, value, ttl = 300) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  if (cache) {
    try {
      await cache.set(key, serialized, 'EX', ttl);
    } catch {
      // Fall back to process memory cache when Redis is unavailable.
    }
  }
  memoryCache.set(key, value, ttl);
}

export async function clearCached(cache, key) {
  if (cache) {
    try {
      await cache.del(key);
    } catch {
      // Fall back to process memory cache when Redis is unavailable.
    }
  }
  memoryCache.del(key);
}
