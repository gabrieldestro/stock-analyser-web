/**
 * GetQuoteUseCase
 * Retrieves the current quotation of a given ticker.
 */
export class GetQuoteUseCase {
  /**
   * @param {import('../domain/repositories/QuoteRepository.js').QuoteRepository} quoteRepository
   */
  constructor(quoteRepository) {
    this.quoteRepository = quoteRepository;
  }

  /**
   * @param {string} ticker
   * @param {{ force?: boolean }} [options]
   * @returns {Promise<import('../domain/entities/Quote.js').Quote>}
   */
  async execute(ticker, options) {
    return this.quoteRepository.getQuote(ticker, options);
  }
}
