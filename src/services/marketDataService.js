const cache = new Map();

const getCacheKey = (prefix, key) => `${prefix}:${key}`;

export const getCached = (key) => cache.get(key);
export const setCached = (key, value, ttlMs) => {
  if (!key) return;
  const expiresAt = Date.now() + ttlMs;
  cache.set(key, { value, expiresAt });
};
export const isCacheValid = (key) => {
  const item = cache.get(key);
  return item && item.expiresAt > Date.now();
};
export const getCachedValue = (key) => {
  const item = cache.get(key);
  return item ? item.value : null;
};

export const setCachedQuote = (symbol, value) => setCached(getCacheKey('quote', symbol), value, 30 * 60 * 1000);
export const setCachedHistorical = (symbol, range, interval, value) => setCached(getCacheKey(`historical:${symbol}:${range}:${interval}`), value, 12 * 60 * 60 * 1000);
export const setCachedDividends = (symbol, value) => setCached(getCacheKey('dividends', symbol), value, 24 * 60 * 60 * 1000);

export const getCachedQuote = (symbol) => getCachedValue(getCacheKey('quote', symbol));
export const getCachedHistorical = (symbol, range, interval) => getCachedValue(getCacheKey(`historical:${symbol}:${range}:${interval}`));
export const getCachedDividends = (symbol) => getCachedValue(getCacheKey('dividends', symbol));

export const getCacheInfo = () => {
  const entries = [];
  cache.forEach((value, key) => {
    entries.push({ key, expiresAt: value.expiresAt });
  });
  return entries;
};
