/**
 * QuoteRepository — Abstract base class / contract
 * Concrete implementations must override getQuote().
 */
export class QuoteRepository {
  /**
   * Returns the current quotation for a given ticker.
   * @param {string} ticker - B3 ticker (e.g. WEGE3, MXRF11)
   * @returns {Promise<import('../entities/Quote.js').Quote>}
   */
  async getQuote(ticker) {
    throw new Error('Não implementado: getQuote()');
  }
}
