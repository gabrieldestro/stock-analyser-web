/**
 * Sidebar
 * Renders and manages the list of reports in the left sidebar.
 * Provides search filtering and report selection callbacks.
 */
export class Sidebar {
  constructor() {
    this._container = document.getElementById('sidebar-reports');
    this._searchInput = document.getElementById('search-input');
    this._sidebar = document.getElementById('sidebar');
    this._overlay = document.getElementById('sidebar-overlay');
    this._mainContent = document.getElementById('main-content');

    this._allReports = [];
    this._activeId = null;
    this._selectCallback = null;
    this._isOpen = true; // desktop default

    this._attachSearchListener();
  }

  /**
   * Registers a callback invoked when the user clicks a report.
   * @param {function(import('../../domain/entities/Report.js').Report): void} callback
   */
  onSelect(callback) {
    this._selectCallback = callback;
  }

  /**
   * Renders the full list of reports.
   * @param {import('../../domain/entities/Report.js').Report[]} reports
   */
  render(reports) {
    this._allReports = reports || [];
    this._renderList(this._allReports);
  }

  /**
   * Shows a loading state.
   */
  showLoading() {
    this._container.innerHTML = `
      <div class="sidebar-empty">
        <div class="spinner"></div>
        <p>Carregando relatórios...</p>
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
   * Marks a report item as active by its id.
   * @param {string} id
   */
  setActive(id) {
    this._activeId = id;
    this._container.querySelectorAll('.report-item').forEach(el => {
      el.classList.toggle('active', el.dataset.id === id);
    });
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
  _renderList(reports) {
    if (!reports || reports.length === 0) {
      this._container.innerHTML = `
        <div class="sidebar-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
          </svg>
          <p>Nenhum relatório encontrado</p>
        </div>`;
      return;
    }

    this._container.innerHTML = reports.map(report => `
      <div class="report-item${report.id === this._activeId ? ' active' : ''}" data-id="${this._esc(report.id)}" role="button" tabindex="0" aria-label="${this._esc(report.title)}">
        <span class="report-item-title">${this._esc(report.title)}</span>
        <span class="report-item-meta">${this._formatMeta(report)}</span>
      </div>
    `).join('');

    // Attach click/keyboard listeners
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
      const q = e.target.value.trim().toLowerCase();
      if (!q) {
        this._renderList(this._allReports);
      } else {
        const filtered = this._allReports.filter(r =>
          r.title.toLowerCase().includes(q)
        );
        this._renderList(filtered);
      }
    });
  }

  /** @private */
  _formatMeta(report) {
    const parts = [];
    if (report.updatedAt) {
      try {
        parts.push(new Date(report.updatedAt).toLocaleDateString('pt-BR'));
      } catch { /* ignore */ }
    }
    if (report.size) {
      parts.push(this._formatBytes(report.size));
    }
    return parts.join(' · ') || 'Relatório Markdown';
  }

  /** @private */
  _formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
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
