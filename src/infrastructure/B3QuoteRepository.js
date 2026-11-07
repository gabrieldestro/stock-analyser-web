import { QuoteRepository } from '../domain/repositories/QuoteRepository.js';
import { Quote } from '../domain/entities/Quote.js';

/**
 * B3QuoteRepository
 * Fetches B3 quotations through TradingView's public scanner endpoint.
 *
 * The official B3 endpoint (cotacao.b3.com.br) does not send CORS headers, so
 * it cannot be called from a browser. TradingView's scanner allows CORS and
 * returns the same delayed B3 quotes (~15 min).
 */
export class B3QuoteRepository extends QuoteRepository {
  static BASE_URL = 'https://scanner.tradingview.com/brazil/scan';
  static TICKER_PATTERN = /^[A-Z][A-Z0-9]{3,5}\d{1,2}$/;
  static COLUMNS = [
    'name',
    'close',
    'change',
    'open',
    'high',
    'low',
    'volume',
    'description',
    'update_mode',
  ];

  /** @private cache keyed by ticker: { at: number, quote: Quote } */
  _cache = new Map();
  _cacheTtlMs = 60 * 1000;

  /**
   * @param {string} ticker
   * @param {{ force?: boolean }} [options] - force=true bypasses the short cache
   * @returns {Promise<Quote>}
   */
  async getQuote(ticker, { force = false } = {}) {
    const symbol = String(ticker || '').trim().toUpperCase();

    if (!B3QuoteRepository.TICKER_PATTERN.test(symbol)) {
      throw new Error(`Ticker inválido: ${ticker}`);
    }

    const cached = this._cache.get(symbol);
    if (!force && cached && Date.now() - cached.at < this._cacheTtlMs) {
      return cached.quote;
    }

    const body = JSON.stringify({
      symbols: { tickers: [`BMFBOVESPA:${symbol}`], query: { types: [] } },
      columns: B3QuoteRepository.COLUMNS,
    });

    // text/plain keeps this a CORS "simple request" (no preflight).
    const resp = await fetch(B3QuoteRepository.BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body,
    });

    if (!resp.ok) {
      throw new Error(`Falha ao buscar cotação (${resp.status})`);
    }

    const json = await resp.json();
    const row = json?.data?.[0]?.d;
    if (!Array.isArray(row) || row.length === 0) {
      throw new Error(`Sem cotação disponível para ${symbol}`);
    }

    const quote = new Quote({
      ticker: row[0] || symbol,
      name: row[7] || symbol,
      price: this._num(row[1]),
      changePercent: this._num(row[2]),
      open: this._num(row[3]),
      high: this._num(row[4]),
      low: this._num(row[5]),
      volume: this._num(row[6]),
      average: null,
      updatedAt: null,
      source: 'TradingView · B3 (atraso ~15 min)',
    });

    this._cache.set(symbol, { at: Date.now(), quote });
    return quote;
  }

  /** @private */
  _num(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
}
