import NodeCache from 'node-cache';

// Create cache with 1 hour TTL
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// Hash function for cache keys
function generateCacheKey(prompt: string, context: any): string {
  const crypto = require('crypto');
  const key = `${prompt}:${JSON.stringify(context)}`;
  return crypto.createHash('md5').update(key).digest('hex');
}

// Get cached response
export function getCachedResponse(key: string): any | null {
  const cached = cache.get(key);
  return cached || null;
}

// Cache a response
export function cacheResponse(key: string, value: any, ttl: number = 3600): void {
  cache.set(key, value, ttl);
}

// Generate cache key for AI response
export function generateAICacheKey(prompt: string, context: any): string {
  // Exclude sensitive data from cache key
  const safeContext = {
    ...context,
    userId: undefined, // Don't include user-specific data in key
    chatId: undefined,
  };
  return generateCacheKey(prompt, safeContext);
}

// Check if response is cached
export function isResponseCached(prompt: string, context: any): boolean {
  const key = generateAICacheKey(prompt, context);
  return cache.has(key);
}

// Get all cache stats
export function getCacheStats() {
  return {
    keys: cache.keys().length,
    stats: cache.getStats(),
  };
}

// Clear cache
export function clearCache(): void {
  cache.flushAll();
}

// Clear specific cache entry
export function clearCacheEntry(key: string): void {
  cache.del(key);
}

// Preload common responses (optional)
export function preloadCommonResponses(): void {
  // This could be used to preload frequently requested responses
  console.log('Cache system initialized');
}
