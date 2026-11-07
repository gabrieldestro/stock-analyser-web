/**
 * Quote Entity
 * Represents the current market quotation of a B3-traded asset.
 */
export class Quote {
  /**
   * @param {object} params
   * @param {string} params.ticker          - B3 ticker (e.g. WEGE3)
   * @param {string} [params.name]          - Asset description
   * @param {number} [params.price]         - Current price
   * @param {number} [params.changePercent] - Intraday change (%)
   * @param {number} [params.open]          - Opening price
   * @param {number} [params.high]          - Daily high
   * @param {number} [params.low]           - Daily low
   * @param {number} [params.average]       - Average price
   * @param {number} [params.volume]        - Traded quantity
   * @param {string} [params.updatedAt]     - Quote timestamp (source-provided)
   * @param {string} [params.source]        - Data source label
   */
  constructor({ ticker, name, price, changePercent, open, high, low, average, volume, updatedAt, source }) {
    this.ticker = ticker;
    this.name = name;
    this.price = price;
    this.changePercent = changePercent;
    this.open = open;
    this.high = high;
    this.low = low;
    this.average = average;
    this.volume = volume;
    this.updatedAt = updatedAt;
    this.source = source;
  }
}
