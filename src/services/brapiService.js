const BRAPI_BASE_URL = 'https://brapi.dev/api/v2/stocks';
const VALID_SYMBOL_RE = /^[A-Za-z0-9.-]+$/;
const DEFAULT_TIMEOUT = 15000;

const normalizeMarketTime = (value) => {
  if (!value) return null;
  if (typeof value === 'number') {
    return new Date(value * 1000).toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

export const sanitizeSymbol = (symbol) => {
  if (!symbol || typeof symbol !== 'string') return null;
  const cleaned = symbol.trim().toUpperCase();
  if (cleaned.includes(' ')) return null;
  if (!VALID_SYMBOL_RE.test(cleaned)) return null;
  return cleaned;
};

const createError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const getBrapiToken = () => {
  const token = process.env.BRAPI_TOKEN;
  if (!token) {
    throw createError(
      401,
      'Token BRAPI_TOKEN ausente no backend local. Configure BRAPI_TOKEN no `.env` ou nas variáveis de ambiente do servidor API.'
    );
  }
  return token;
};

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      const body = await response.text().catch(() => null);
      throw createError(response.status, body || `Erro na API brapi.dev: ${response.status}`);
    }
    const json = await response.json();
    return json;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw createError(504, 'Timeout ao acessar brapi.dev');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const toStringValue = (value) => (value == null ? null : String(value));

export const normalizeQuoteResponse = (requestedSymbol, raw) => {
  const result = raw?.results?.[0] || {};
  const symbol = toStringValue(result.symbol || requestedSymbol);
  const currency = toStringValue(result.currency || result.currencySymbol || 'BRL');
  const price = Number(result.regularMarketPrice ?? result.close ?? null);
  const change = Number(result.regularMarketChange ?? result.change ?? null);
  const changePercent = Number(result.regularMarketChangePercent ?? result.changePercent ?? null);
  const dayLow = Number(result.regularMarketDayLow ?? result.dayLow ?? null);
  const dayHigh = Number(result.regularMarketDayHigh ?? result.dayHigh ?? null);
  const previousClose = Number(result.regularMarketPreviousClose ?? result.previousClose ?? null);
  const open = Number(result.regularMarketOpen ?? result.open ?? null);
  const fiftyTwoWeekLow = Number(result.fiftyTwoWeekLow ?? result.yearHigh ?? null);
  const fiftyTwoWeekHigh = Number(result.fiftyTwoWeekHigh ?? result.yearLow ?? null);
  const marketTime = normalizeMarketTime(result.regularMarketTime || result.marketTime);
  const requestedAt = new Date().toISOString();
  return {
    requestedSymbol,
    symbol,
    changed: Boolean(result.changed ?? false),
    shortName: toStringValue(result.shortName || result.displayName || null),
    longName: toStringValue(result.longName || result.name || null),
    currency,
    price: Number.isNaN(price) ? null : price,
    dayHigh: Number.isNaN(dayHigh) ? null : dayHigh,
    dayLow: Number.isNaN(dayLow) ? null : dayLow,
    dayRange: dayLow != null && dayHigh != null ? `${dayLow.toFixed(2)} - ${dayHigh.toFixed(2)}` : null,
    change: Number.isNaN(change) ? null : change,
    changePercent: Number.isNaN(changePercent) ? null : changePercent,
    marketTime,
    marketCap: Number(result.marketCap ?? null),
    volume: Number(result.regularMarketVolume ?? result.volume ?? null),
    previousClose: Number.isNaN(previousClose) ? null : previousClose,
    open: Number.isNaN(open) ? null : open,
    fiftyTwoWeekLow: Number.isNaN(fiftyTwoWeekLow) ? null : fiftyTwoWeekLow,
    fiftyTwoWeekHigh: Number.isNaN(fiftyTwoWeekHigh) ? null : fiftyTwoWeekHigh,
    fiftyTwoWeekRange:
      !Number.isNaN(fiftyTwoWeekLow) && !Number.isNaN(fiftyTwoWeekHigh)
        ? `${fiftyTwoWeekLow.toFixed(2)} - ${fiftyTwoWeekHigh.toFixed(2)}`
        : null,
    logoUrl: toStringValue(result.logoUrl || null),
    requestedAt,
    stale: false,
  };
};

export const fetchBrapiQuote = async (symbol) => {
  const sanitized = sanitizeSymbol(symbol);
  if (!sanitized) {
    throw createError(400, 'Ticker inválido');
  }
  const token = getBrapiToken();

  const url = `${BRAPI_BASE_URL}/quote?symbols=${encodeURIComponent(sanitized)}`;
  const raw = await fetchWithTimeout(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!raw?.results?.length) {
    throw createError(404, 'Ticker não encontrado');
  }

  return normalizeQuoteResponse(sanitized, raw);
};

export const fetchBrapiHistorical = async (symbol, range = '1y', interval = '1d', sortOrder = 'asc') => {
  const sanitized = sanitizeSymbol(symbol);
  if (!sanitized) {
    throw createError(400, 'Ticker inválido');
  }
  const token = getBrapiToken();

  const params = new URLSearchParams({
    symbols: sanitized,
    range,
    interval,
    sortOrder,
  });

  const url = `${BRAPI_BASE_URL}/historical?${params.toString()}`;
  const raw = await fetchWithTimeout(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = raw?.results?.[0]?.historical || [];
  return {
    requestedSymbol: sanitized,
    symbol: raw?.results?.[0]?.symbol || sanitized,
    data: Array.isArray(data)
      ? data.map((item) => ({
          date: item.date || null,
          open: item.open ?? null,
          high: item.high ?? null,
          low: item.low ?? null,
          close: item.close ?? null,
          adjustedClose: item.adjustedClose ?? item.adjClose ?? null,
          volume: item.volume ?? null,
        }))
      : [],
    requestedAt: new Date().toISOString(),
  };
};

export const fetchBrapiDividends = async (symbol) => {
  const sanitized = sanitizeSymbol(symbol);
  if (!sanitized) {
    throw createError(400, 'Ticker inválido');
  }
  const token = getBrapiToken();

  const url = `${BRAPI_BASE_URL}/dividends?symbols=${encodeURIComponent(sanitized)}`;
  const raw = await fetchWithTimeout(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const dataset = raw?.results?.[0]?.dividends || [];
  return {
    requestedSymbol: sanitized,
    symbol: raw?.results?.[0]?.symbol || sanitized,
    data: Array.isArray(dataset)
      ? dataset.map((item) => ({
          date: item.date || null,
          type: item.type || null,
          amount: item.amount ?? null,
          declaredDate: item.declaredDate || null,
          paymentDate: item.paymentDate || null,
        }))
      : [],
    requestedAt: new Date().toISOString(),
  };
};
