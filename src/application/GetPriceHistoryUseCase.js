/**
 * GetPriceHistoryUseCase
 * Retrieves monthly closing prices for a given ticker.
 */
export class GetPriceHistoryUseCase {
  /**
   * @param {import('../domain/repositories/PriceHistoryRepository.js').PriceHistoryRepository} priceHistoryRepository
   */
  constructor(priceHistoryRepository) {
    this.priceHistoryRepository = priceHistoryRepository;
  }

  /**
   * @param {string} ticker
   * @param {{ range?: string, force?: boolean }} [options]
   * @returns {Promise<Record<string, number>>}
   */
  async execute(ticker, options) {
    return this.priceHistoryRepository.getMonthlyCloses(ticker, options);
  }
}
