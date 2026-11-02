/**
 * ListReportsUseCase
 * Returns the list of available reports from the repository.
 */
export class ListReportsUseCase {
  /**
   * @param {import('../domain/repositories/ReportRepository.js').ReportRepository} reportRepository
   */
  constructor(reportRepository) {
    this.reportRepository = reportRepository;
  }

  /**
   * @returns {Promise<import('../domain/entities/Report.js').Report[]>}
   */
  async execute() {
    return this.reportRepository.listReports();
  }
}
