import { QuoteRepository } from '../domain/repositories/QuoteRepository.js';
import { Quote } from '../domain/entities/Quote.js';

/**
 * B3QuoteRepository
 * Fetches the current quotation from B3's public market-data API.
 * Endpoint is free, requires no token and sends permissive CORS headers.
 */
export class B3QuoteRepository extends QuoteRepository {
  static BASE_URL = 'https://cotacao.b3.com.br/mds/api/v1/InstrumentQuotation';
  static TICKER_PATTERN = /^[A-Z][A-Z0-9]{3,5}\d{1,2}$/;

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

    const url = `${B3QuoteRepository.BASE_URL}/${encodeURIComponent(symbol)}`;
    const resp = await fetch(url, { headers: { Accept: 'application/json' } });

    if (!resp.ok) {
      throw new Error(`B3 API erro ${resp.status}`);
    }

    const json = await resp.json();
    const status = json?.BizSts?.cd;

    if (status && status !== 'OK') {
      throw new Error(`B3 retornou status ${status}`);
    }

    const trades = json?.Trad;
    if (!Array.isArray(trades) || trades.length === 0) {
      throw new Error(`Sem cotação disponível para ${symbol}`);
    }

    const trade = trades.find(t => t?.scty?.mkt?.nm === 'Vista') || trades[0];
    const quoteData = trade?.scty?.SctyQtn || {};

    const quote = new Quote({
      ticker: trade?.scty?.symb || symbol,
      name: (trade?.scty?.desc || '').replace(/\s+/g, ' ').trim() || symbol,
      price: this._num(quoteData.curPrc),
      changePercent: this._num(quoteData.prcFlcn),
      open: this._num(quoteData.opngPric),
      high: this._num(quoteData.maxPric),
      low: this._num(quoteData.minPric),
      average: this._num(quoteData.avrgPric),
      volume: this._num(trade?.ttlQty),
      updatedAt: json?.Msg?.dtTm || null,
      source: 'B3',
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
