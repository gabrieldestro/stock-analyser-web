import { PriceHistoryRepository } from '../domain/repositories/PriceHistoryRepository.js';

/**
 * YahooPriceRepository
 * Fetches monthly closing prices from Yahoo Finance.
 *
 * Yahoo's chart endpoint does not send CORS headers, so requests go through
 * a public reader/proxy that echoes the caller Origin. Jina is tried first
 * (more reliable); allorigins is kept as a fallback.
 */
export class YahooPriceRepository extends PriceHistoryRepository {
  static BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/';
  static JINA_URL = 'https://r.jina.ai/';
  static ALLORIGINS_URL = 'https://api.allorigins.win/raw?url=';
  static TICKER_PATTERN = /^[A-Z][A-Z0-9]{3,5}\d{1,2}$/;

  /** @private cache keyed by "TICKER:range": { at, closes } */
  _cache = new Map();
  _cacheTtlMs = 30 * 60 * 1000;

  /**
   * @param {string} ticker
   * @param {{ range?: string, force?: boolean }} [options]
   * @returns {Promise<Record<string, number>>} closes keyed by "YYYY-MM"
   */
  async getMonthlyCloses(ticker, { range = '20y', force = false } = {}) {
    const symbol = String(ticker || '').trim().toUpperCase();

    if (!YahooPriceRepository.TICKER_PATTERN.test(symbol)) {
      throw new Error(`Ticker inválido: ${ticker}`);
    }

    const cacheKey = `${symbol}:${range}`;
    const cached = this._cache.get(cacheKey);
    if (!force && cached && Date.now() - cached.at < this._cacheTtlMs) {
      return cached.closes;
    }

    const yahooUrl = `${YahooPriceRepository.BASE_URL}${symbol}.SA?interval=1mo&range=${encodeURIComponent(range)}`;

    let json;
    try {
      json = await this._fetchViaJina(yahooUrl);
    } catch (primaryError) {
      console.warn('[price] Jina falhou, tentando allorigins:', primaryError.message);
      json = await this._fetchViaAllorigins(yahooUrl);
    }

    if (json?.chart?.error) {
      throw new Error(json.chart.error.description || 'Histórico de preços indisponível');
    }

    const result = json?.chart?.result?.[0];
    const timestamps = result?.timestamp;
    const closes = result?.indicators?.quote?.[0]?.close;
    if (!Array.isArray(timestamps) || !Array.isArray(closes)) {
      throw new Error(`Sem histórico de preços para ${symbol}`);
    }

    const byMonth = {};
    timestamps.forEach((ts, index) => {
      const close = closes[index];
      if (close == null || !Number.isFinite(close)) return;

      const date = new Date(ts * 1000);
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = close;
    });

    this._cache.set(cacheKey, { at: Date.now(), closes: byMonth });
    return byMonth;
  }

  /** @private */
  async _fetchViaJina(yahooUrl) {
    const resp = await fetch(`${YahooPriceRepository.JINA_URL}${yahooUrl}`);
    if (!resp.ok) {
      throw new Error(`Falha ao buscar histórico (${resp.status})`);
    }

    const text = await resp.text();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) {
      throw new Error('Resposta inesperada do provedor de preços');
    }

    return JSON.parse(text.slice(start, end + 1));
  }

  /** @private */
  async _fetchViaAllorigins(yahooUrl) {
    const url = `${YahooPriceRepository.ALLORIGINS_URL}${encodeURIComponent(yahooUrl)}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Falha ao buscar histórico (${resp.status})`);
    }
    return resp.json();
  }
}
