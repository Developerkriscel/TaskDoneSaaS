import Redis from 'ioredis';

let redisClient = null;

export function getCacheClient() {
  if (redisClient) return redisClient;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableAutoPipelining: true,
      lazyConnect: true
    });

    redisClient.on('error', (err) => {
      console.error('[cache] Redis error:', err.message);
    });

    return redisClient;
  } catch (error) {
    console.error('[cache] Redis init failed:', error.message);
    return null;
  }
}
