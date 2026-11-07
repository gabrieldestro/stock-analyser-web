/**
 * Sidebar
 * Renders the list of assets (one entry per ticker), grouped by category,
 * with quick search and category filters.
 */
export class Sidebar {
  constructor() {
    this._container = document.getElementById('sidebar-reports');
    this._searchInput = document.getElementById('search-input');
    this._categoryBar = document.getElementById('sidebar-categories');
    this._sidebar = document.getElementById('sidebar');
    this._overlay = document.getElementById('sidebar-overlay');
    this._mainContent = document.getElementById('main-content');

    this._allReports = [];
    this._activeId = null;
    this._selectCallback = null;
    this._isOpen = true; // desktop default
    this._category = 'all';
    this._query = '';

    this._attachSearchListener();
    this._attachCategoryListeners();
  }

  /**
   * Registers a callback invoked when the user clicks an asset.
   * @param {function(import('../../domain/entities/Report.js').Report): void} callback
   */
  onSelect(callback) {
    this._selectCallback = callback;
  }

  /**
   * Renders the full list of assets.
   * @param {import('../../domain/entities/Report.js').Report[]} reports
   */
  render(reports) {
    this._allReports = reports || [];
    this._renderList();
  }

  /** Shows a loading state. */
  showLoading() {
    this._container.innerHTML = `
      <div class="sidebar-empty">
        <div class="spinner"></div>
        <p>Carregando ativos...</p>
      </div>`;
  }

  /**
   * Shows an error state.
   * @param {string} message
   */
  showError(message) {
    this._container.innerHTML = `
      <div class="sidebar-empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f85149" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p style="color: var(--danger); font-size:13px;">${this._esc(message)}</p>
      </div>`;
  }

  /**
   * Marks an asset item as active by its id.
   * @param {string} id
   */
  setActive(id) {
    this._activeId = id;
    this._container.querySelectorAll('.report-item').forEach(el => {
      el.classList.toggle('active', el.dataset.id === id);
    });
  }

  /** Updates the display name of an asset after its details load. */
  updateAssetName(id, name) {
    const report = this._allReports.find(r => r.id === id);
    if (report) report.name = name;
    this._renderList();
  }

  /** Open the sidebar (mobile/tablet). */
  open() {
    this._isOpen = true;
    this._sidebar.classList.remove('closed');
    this._sidebar.classList.add('open');
    this._overlay.classList.add('visible');
    this._mainContent.classList.remove('sidebar-closed');
  }

  /** Close the sidebar (mobile/tablet). */
  close() {
    this._isOpen = false;
    this._sidebar.classList.add('closed');
    this._sidebar.classList.remove('open');
    this._overlay.classList.remove('visible');
    this._mainContent.classList.add('sidebar-closed');
  }

  /** Toggle sidebar open/closed. */
  toggle() {
    if (this._isOpen) this.close();
    else this.open();
  }

  /** @private */
  _renderList() {
    let reports = this._allReports;

    if (this._category !== 'all') {
      reports = reports.filter(r => r.category === this._category);
    }

    if (this._query) {
      const q = this._query;
      reports = reports.filter(r =>
        `${r.title} ${r.name || ''}`.toLowerCase().includes(q)
      );
    }

    if (!reports.length) {
      this._container.innerHTML = `
        <div class="sidebar-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
          </svg>
          <p>Nenhum ativo encontrado</p>
        </div>`;
      return;
    }

    const groups = { acoes: [], fiis: [], outros: [] };
    for (const report of reports) {
      (groups[report.category] || groups.outros).push(report);
    }

    const labels = { acoes: 'Ações', fiis: 'FIIs', outros: 'Outros' };
    const html = [];

    for (const key of ['acoes', 'fiis', 'outros']) {
      const list = groups[key];
      if (!list.length) continue;

      html.push(`
        <div class="sidebar-group-title">
          <span>${labels[key]}</span>
          <span class="sidebar-group-count">${list.length}</span>
        </div>`);

      html.push(list.map(report => `
        <div class="report-item${report.id === this._activeId ? ' active' : ''}" data-id="${this._esc(report.id)}" role="button" tabindex="0" aria-label="${this._esc(report.title)}">
          <span class="report-item-title">${this._esc(report.title)}</span>
          <span class="report-item-meta">${this._esc(report.name || (key === 'fiis' ? 'Fundo imobiliário' : 'Análise fundamentalista'))}</span>
        </div>
      `).join(''));
    }

    this._container.innerHTML = html.join('');

    this._container.querySelectorAll('.report-item').forEach(el => {
      el.addEventListener('click', () => this._handleSelect(el.dataset.id));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._handleSelect(el.dataset.id);
        }
      });
    });
  }

  /** @private */
  _handleSelect(id) {
    const report = this._allReports.find(r => r.id === id);
    if (!report) return;
    this.setActive(id);
    this._selectCallback?.(report);

    // Auto-close on mobile
    if (window.innerWidth <= 768) this.close();
  }

  /** @private */
  _attachSearchListener() {
    this._searchInput?.addEventListener('input', (e) => {
      this._query = e.target.value.trim().toLowerCase();
      this._renderList();
    });
  }

  /** @private */
  _attachCategoryListeners() {
    if (!this._categoryBar) return;

    this._categoryBar.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._category = btn.dataset.category || 'all';
        this._categoryBar.querySelectorAll('.category-btn').forEach(b => {
          b.classList.toggle('active', b === btn);
        });
        this._renderList();
      });
    });
  }

  /** @private */
  _esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
