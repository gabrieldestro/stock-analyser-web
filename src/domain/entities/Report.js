/**
 * Report Entity
 * Represents a single market analysis report.
 */
export class Report {
  /**
   * @param {object} params
   * @param {string} params.id        - Unique identifier (usually the file path)
   * @param {string} params.title     - Human-readable title
   * @param {string} [params.content] - Markdown content (populated on detail load)
   * @param {string} [params.updatedAt] - ISO date string
   * @param {number} [params.size]    - File size in bytes
   * @param {string} [params.path]    - Repository path
   */
  constructor({ id, title, content, updatedAt, size, path }) {
    this.id = id;
    this.title = title;
    this.content = content;
    this.updatedAt = updatedAt;
    this.size = size;
    this.path = path;
  }
}
