/**
 * Report Entity
 * Represents a single asset (ação or FII) and the files that compose its tabs.
 *
 * A Report summary is returned by listReports(); the detail version (with
 * `content` and `csv`) is returned by getReportById().
 */
export class Report {
  /**
   * @param {object} params
   * @param {string} params.id          - Asset folder path (unique identifier)
   * @param {string} params.title       - Short label shown in the sidebar (ticker/folder)
   * @param {string} [params.name]      - Full asset name (e.g. "WEG S.A.")
   * @param {string} [params.ticker]    - B3 ticker parsed from the summary (e.g. "WEGE3")
   * @param {string} [params.category]  - "acoes" | "fiis" | "outros"
   * @param {object} [params.files]     - Map of role -> repo path (summary, history, indicators, historicalCsv, additionalCsv)
   * @param {object} [params.content]   - Map of tab -> markdown (summary, history, data)
   * @param {object} [params.csv]       - Map with raw CSV text (historical, additional)
   * @param {string} [params.path]      - Repository path
   * @param {number} [params.size]      - Total size in bytes
   * @param {string} [params.updatedAt] - ISO date string
   */
  constructor({
    id,
    title,
    name = null,
    ticker = null,
    category = 'outros',
    files = {},
    content = null,
    csv = null,
    path,
    size,
    updatedAt,
  }) {
    this.id = id;
    this.title = title;
    this.name = name;
    this.ticker = ticker;
    this.category = category;
    this.files = files;
    this.content = content;
    this.csv = csv;
    this.path = path;
    this.size = size;
    this.updatedAt = updatedAt;
  }
}
