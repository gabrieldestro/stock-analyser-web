/**
 * ReportRepository — Abstract base class / contract
 * Concrete implementations must override all methods.
 */
export class ReportRepository {
  /**
   * Returns a list of report summaries (no content).
   * @returns {Promise<import('../entities/Report.js').Report[]>}
   */
  async listReports() {
    throw new Error('Não implementado: listReports()');
  }

  /**
   * Returns a single report with full content by its identifier.
   * @param {string} id
   * @returns {Promise<import('../entities/Report.js').Report>}
   */
  async getReportById(id) {
    throw new Error('Não implementado: getReportById()');
  }

  /**
   * Verifies that the data source is reachable and credentials are valid.
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    throw new Error('Não implementado: testConnection()');
  }
}
