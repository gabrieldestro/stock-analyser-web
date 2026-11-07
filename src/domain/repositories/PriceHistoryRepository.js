/**
 * PriceHistoryRepository — Abstract base class / contract
 * Concrete implementations must override getMonthlyCloses().
 */
export class PriceHistoryRepository {
  /**
   * Returns monthly closing prices for a B3 ticker, keyed by "YYYY-MM".
   * @param {string} ticker - B3 ticker (e.g. WEGE3, HGLG11)
   * @param {{ range?: string, force?: boolean }} [options]
   * @returns {Promise<Record<string, number>>}
   */
  async getMonthlyCloses(ticker, options) {
    throw new Error('Não implementado: getMonthlyCloses()');
  }
}
