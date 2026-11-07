import { ReportRepository } from '../domain/repositories/ReportRepository.js';
import { Report } from '../domain/entities/Report.js';

/**
 * GitHubReportRepository
 * Fetches asset folders from a GitHub repository via the GitHub Contents API.
 *
 * Expected layout:
 *   {basePath}/acoes/{TICKER}/resumo_institucional_*.md
 *   {basePath}/acoes/{TICKER}/analise_historica_*.md
 *   {basePath}/acoes/{TICKER}/indicadores_*.md
 *   {basePath}/acoes/{TICKER}/historico_contabil_*.csv
 *   {basePath}/fiis/{TICKER}/...
 *
 * Each ticker folder becomes a single Report (asset) in the sidebar.
 */
export class GitHubReportRepository extends ReportRepository {
  /**
   * @param {string} token    - GitHub Personal Access Token
   * @param {string} owner    - Repository owner (user or org)
   * @param {string} repo     - Repository name
   * @param {string} basePath - Folder inside the repo that contains the category folders
   */
  constructor(token, owner, repo, basePath = 'relatorios') {
    super();
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.basePath = basePath.replace(/^\/+|\/+$/g, '') || 'relatorios';
  }

  /** @private */
  _headers() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  /** @private */
  _encodePath(path) {
    return String(path).split('/').map(encodeURIComponent).join('/');
  }

  /** @private */
  async _getContents(path) {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${this._encodePath(path)}`;
    const resp = await fetch(url, { headers: this._headers() });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(`GitHub API erro ${resp.status}: ${err.message || resp.statusText}`);
    }

    const items = await resp.json();
    if (!Array.isArray(items)) {
      throw new Error('Resposta inesperada da API do GitHub — esperava um array.');
    }
    return items;
  }

  /** @private */
  async _getRaw(path) {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${this._encodePath(path)}`;
    const resp = await fetch(url, {
      headers: { ...this._headers(), 'Accept': 'application/vnd.github.v3.raw' },
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Não foi possível carregar ${path} (${resp.status}): ${text || resp.statusText}`);
    }
    return resp.text();
  }

  /**
   * Lists one Report per asset folder found under basePath (recursively).
   * @returns {Promise<Report[]>}
   */
  async listReports() {
    const files = await this._collectFiles(this.basePath);
    return this._groupByAsset(files).sort((a, b) => {
      const cat = a.category.localeCompare(b.category);
      return cat !== 0 ? cat : a.title.localeCompare(b.title);
    });
  }

  /**
   * Fetches all files of one asset folder and returns its full content.
   * @param {string} id - Asset folder path (e.g. "relatorios/acoes/WEGE")
   * @returns {Promise<Report>}
   */
  async getReportById(id) {
    const items = await this._collectFiles(id);
    const files = this._pickFiles(items);
    const dirTicker = String(id).split('/').pop();

    const [summary, history, indicators, historicalCsv, additionalCsv] = await Promise.all([
      files.summary ? this._getRaw(files.summary) : Promise.resolve(''),
      files.history ? this._getRaw(files.history) : Promise.resolve(''),
      files.indicators ? this._getRaw(files.indicators) : Promise.resolve(''),
      files.historicalCsv ? this._getRaw(files.historicalCsv) : Promise.resolve(''),
      files.additionalCsv ? this._getRaw(files.additionalCsv) : Promise.resolve(''),
    ]);

    const meta = this._parseSummaryMeta(summary, dirTicker);
    const relSegs = String(id).slice(this.basePath.length + 1).split('/');

    return new Report({
      id,
      title: meta.ticker || dirTicker,
      ticker: meta.ticker || dirTicker,
      name: meta.name,
      category: ['acoes', 'fiis'].includes(relSegs[0]) ? relSegs[0] : 'outros',
      path: id,
      files,
      content: { summary, history, data: indicators },
      csv: { historical: historicalCsv, additional: additionalCsv },
      size: items.reduce((sum, item) => sum + (item.size || 0), 0),
      updatedAt: null,
    });
  }

  /**
   * Validates credentials by attempting to list assets.
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    await this.listReports();
    return true;
  }

  /** @private */
  async _collectFiles(path) {
    const items = await this._getContents(path);
    const nested = await Promise.all(items.map(item => {
      if (item.type === 'file') return [item];
      if (item.type === 'dir') return this._collectFiles(item.path);
      return [];
    }));
    return nested.flat();
  }

  /** @private */
  _groupByAsset(files) {
    const groups = new Map();

    for (const file of files) {
      const dir = file.path.slice(0, file.path.lastIndexOf('/'));
      if (!dir || dir === this.basePath) continue;

      const relSegs = dir.slice(this.basePath.length + 1).split('/');
      if (relSegs.some(seg => /^v\d+$/i.test(seg))) continue; // ignore versioned copies (fiis/v1)

      if (!groups.has(dir)) groups.set(dir, []);
      groups.get(dir).push(file);
    }

    return [...groups.entries()]
      .map(([dir, items]) => this._buildSummary(dir, items))
      .filter(report => Object.keys(report.files).length > 0);
  }

  /** @private */
  _buildSummary(dir, items) {
    const files = this._pickFiles(items);
    const relSegs = dir.slice(this.basePath.length + 1).split('/');
    const dirTicker = relSegs[relSegs.length - 1];

    return new Report({
      id: dir,
      title: dirTicker,
      ticker: dirTicker,
      name: null,
      category: ['acoes', 'fiis'].includes(relSegs[0]) ? relSegs[0] : 'outros',
      path: dir,
      files,
      size: items.reduce((sum, item) => sum + (item.size || 0), 0),
      updatedAt: null,
    });
  }

  /** @private */
  _pickFiles(items) {
    const files = {};

    for (const item of items) {
      if (item.type !== 'file') continue;
      const name = item.name.toLowerCase();

      if (/^resumo_institucional.*\.md$/.test(name)) files.summary = item.path;
      else if (/^analise_historica.*\.md$/.test(name)) files.history = item.path;
      else if (/^indicadores.*\.md$/.test(name)) files.indicators = item.path;
      else if (/^historico_contabil.*\.csv$/.test(name)) files.historicalCsv = item.path;
      else if (/^dados_adicionais.*\.csv$/.test(name)) files.additionalCsv = item.path;
    }

    return files;
  }

  /**
   * Extracts the B3 ticker and the company/fund name from the summary heading.
   * Example: "# Resumo Institucional - WEG S.A. (WEGE3)"
   * @private
   */
  _parseSummaryMeta(summary, fallbackTicker) {
    const heading = (summary.match(/^#\s+(.+)$/m) || [])[1] || '';
    const tickerMatch = heading.match(/\(([A-Z]{4}\d{1,2})\b/);
    const ticker = tickerMatch ? tickerMatch[1] : fallbackTicker;

    let name = heading
      .replace(/^resumo institucional\s*[-—–]\s*/i, '')
      .replace(/\s*\([^)]*\)\s*$/, '')
      .trim();

    if (!name || /^resumo institucional/i.test(name)) name = null;

    return { ticker, name };
  }
}
