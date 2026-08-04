const BRAPI_BASE_URL = 'https://brapi.dev/api/v2/stocks';
const BRAPI_TOKEN = import.meta.env.VITE_BRAPI_TOKEN || '';

const createError = async (response) => {
  const text = await response.text().catch(() => 'Erro desconhecido');
  const contentType = response.headers.get('content-type') || '';
  const snippet = text ? text.slice(0, 220) : null;
  const message = contentType.includes('text/html')
    ? `Resposta HTML inesperada da API (${response.status}). Verifique se a conexão com brapi.dev está funcionando.`
    : snippet
      ? `Erro na API BRAPI: ${response.status}. Resposta: ${snippet}`
      : `Erro na API BRAPI: ${response.status}`;
  const error = new Error(message);
  error.status = response.status;
  throw error;
};

const handleResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text().catch(() => '');

  if (!response.ok) {
    const message = response.status === 401
      ? 'Autenticação BRAPI falhou. Verifique VITE_BRAPI_TOKEN e reinicie o servidor de desenvolvimento.'
      : text || `Erro na API BRAPI: ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (!contentType.includes('application/json')) {
    const snippet = text ? text.slice(0, 220) : 'Resposta vazia';
    const error = new Error(`Resposta inesperada da API: ${snippet}`);
    error.status = response.status;
    throw error;
  }

  let payload;
  try {
    payload = JSON.parse(text || '{}');
  } catch (err) {
    const snippet = text ? text.slice(0, 220) : 'Resposta vazia';
    const error = new Error(`Resposta JSON inválida: ${snippet}`);
    error.status = response.status;
    throw error;
  }

  if (payload?.error) {
    const error = new Error(payload.error);
    error.status = response.status;
    throw error;
  }
  return payload;
};

const fetchBrapi = async (path) => {
  if (!BRAPI_TOKEN) {
    throw new Error('Token VITE_BRAPI_TOKEN ausente. Configure-o em .env e reinicie o servidor de desenvolvimento.');
  }

  const url = `${BRAPI_BASE_URL}${path}`;
  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${BRAPI_TOKEN}`,
  };
  const response = await fetch(url, { headers });
  return handleResponse(response);
};

const normalizeSymbols = (symbols) => {
  if (!symbols || symbols.length === 0) return [];
  return symbols
    .map((symbol) => String(symbol || '').trim().toUpperCase())
    .filter(Boolean);
};

const normalizeQuoteResult = (raw) => ({
  data: Array.isArray(raw?.results) ? raw.results : [],
});

export const fetchMarketPortfolioQuotes = async (symbols) => {
  const cleaned = normalizeSymbols(symbols);
  if (cleaned.length === 0) return { data: [] };
  if (cleaned.length === 1) {
    return fetchMarketQuote(cleaned[0]);
  }

  const quoteResults = await Promise.all(cleaned.map(async (symbol) => {
    try {
      const result = await fetchMarketQuote(symbol);
      return Array.isArray(result?.data) ? result.data[0] : null;
    } catch (error) {
      console.warn(`BRAPI quote falhou para ${symbol}:`, error);
      return null;
    }
  }));

  const data = quoteResults.filter(Boolean);
  if (data.length === 0) {
    throw new Error('Não foi possível carregar cotações BRAPI para os ativos selecionados. Verifique sua conexão e o token BRAPI.');
  }

  return { data };
};

export const fetchMarketQuote = async (symbol) => {
  const sanitized = String(symbol || '').trim().toUpperCase();
  const raw = await fetchBrapi(`/quote?symbols=${encodeURIComponent(sanitized)}`);
  return normalizeQuoteResult(raw);
};

export const fetchMarketHistorical = async (symbol, options = {}) => {
  const sanitized = String(symbol || '').trim().toUpperCase();
  const params = new URLSearchParams({
    symbols: sanitized,
    range: options.range || '1y',
    interval: options.interval || '1d',
    sortOrder: options.sortOrder || 'asc',
  });
  const raw = await fetchBrapi(`/historical?${params.toString()}`);
  return {
    data: Array.isArray(raw?.results?.[0]?.historical) ? raw.results[0].historical : [],
  };
};

export const fetchMarketDividends = async (symbol) => {
  const sanitized = String(symbol || '').trim().toUpperCase();
  const raw = await fetchBrapi(`/dividends?symbols=${encodeURIComponent(sanitized)}`);
  return {
    data: Array.isArray(raw?.results?.[0]?.dividends) ? raw.results[0].dividends : [],
  };
};
