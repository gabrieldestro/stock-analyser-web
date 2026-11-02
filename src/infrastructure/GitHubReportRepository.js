import { ReportRepository } from '../domain/repositories/ReportRepository.js';
import { Report } from '../domain/entities/Report.js';

/**
 * GitHubReportRepository
 * Fetches markdown reports from a private GitHub repository via the GitHub Contents API.
 */
export class GitHubReportRepository extends ReportRepository {
  /**
   * @param {string} token    - GitHub Personal Access Token
   * @param {string} owner    - Repository owner (user or org)
   * @param {string} repo     - Repository name
   * @param {string} basePath - Folder inside the repo that contains .md files
   */
  constructor(token, owner, repo, basePath = 'relatorios') {
    super();
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.basePath = basePath;
  }

  /** @private */
  _headers() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  /**
   * Lists all .md files in the base path.
   * @returns {Promise<Report[]>}
   */
  async listReports() {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${this.basePath}`;
    const resp = await fetch(url, { headers: this._headers() });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(`GitHub API erro ${resp.status}: ${err.message || resp.statusText}`);
    }

    const items = await resp.json();
    if (!Array.isArray(items)) {
      throw new Error('Resposta inesperada da API do GitHub — esperava um array.');
    }

    return items
      .filter(item => item.type === 'file' && item.name.endsWith('.md'))
      .map(item => new Report({
        id: item.path,
        title: this._formatTitle(item.name),
        path: item.path,
        size: item.size,
        updatedAt: null, // Contents API doesn't return dates; we'd need commits API
        content: null,
      }));
  }

  /**
   * Fetches the raw markdown content of a specific report.
   * @param {string} path - File path within the repo (used as id)
   * @returns {Promise<Report>}
   */
  async getReportById(path) {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`;
    const resp = await fetch(url, {
      headers: {
        ...this._headers(),
        'Accept': 'application/vnd.github.v3.raw',
      },
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Não foi possível carregar o relatório (${resp.status}): ${text || resp.statusText}`);
    }

    const content = await resp.text();
    const name = path.split('/').pop();

    return new Report({
      id: path,
      title: this._formatTitle(name),
      content,
      path,
      size: content.length,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Validates credentials by attempting to list reports.
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    await this.listReports();
    return true;
  }

  /** @private */
  _formatTitle(filename) {
    return filename
      .replace(/\.md$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
}
