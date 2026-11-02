/**
 * GetReportDetailsUseCase
 * Retrieves the full content of a specific report.
 */
export class GetReportDetailsUseCase {
  /**
   * @param {import('../domain/repositories/ReportRepository.js').ReportRepository} reportRepository
   */
  constructor(reportRepository) {
    this.reportRepository = reportRepository;
  }

  /**
   * @param {string} reportId
   * @returns {Promise<import('../domain/entities/Report.js').Report>}
   */
  async execute(reportId) {
    return this.reportRepository.getReportById(reportId);
  }
}
