/**
 * MarkdownViewer
 * Renders the three tabs of an asset:
 *   summary  -> resumo_institucional
 *   history  -> analise_historica
 *   data     -> indicadores (tables); the chart is handled by DataChart
 */
export class MarkdownViewer {
  constructor() {
    this._summaryEl     = document.getElementById('markdown-content');
    this._historyEl     = document.getElementById('markdown-history');
    this._dataEl        = document.getElementById('markdown-data');
    this._reportView    = document.getElementById('report-view');
    this._welcomeScreen = document.getElementById('welcome-screen');

    this._tabBtns   = document.querySelectorAll('.tab-btn');
    this._tabPanels = document.querySelectorAll('.tab-panel');

    this._onTabChange = null;
    this._attachTabListeners();
  }

  /** Registers a callback invoked with the active tab id. */
  onTabChange(callback) {
    this._onTabChange = callback;
  }

  /**
   * Renders the asset content in its tabs.
   * @param {import('../../domain/entities/Report.js').Report} report
   */
  render(report) {
    const content = report?.content || {};

    this._welcomeScreen.style.display = 'none';
    this._reportView.style.display = 'flex';

    this._renderMarkdown(this._summaryEl, content.summary);
    this._renderMarkdown(this._historyEl, content.history);
    this._renderMarkdown(this._dataEl, content.data);

    this._activateTab('summary');
  }

  /** Shows a loading indicator in the main area. */
  showLoading() {
    this._welcomeScreen.style.display = 'none';
    this._reportView.style.display = 'flex';
    this._summaryEl.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Carregando ativo...</p>
      </div>`;
    this._historyEl.innerHTML = '';
    this._dataEl.innerHTML = '';
    this._activateTab('summary');
  }

  /** Shows an error message. */
  showError(message) {
    this._welcomeScreen.style.display = 'none';
    this._reportView.style.display = 'flex';
    this._summaryEl.innerHTML = `
      <div class="error-state">
        <span class="error-icon">⚠️</span>
        <strong>Erro ao carregar ativo</strong>
        <p style="color: var(--text-muted); font-size: 14px;">${this._esc(message)}</p>
      </div>`;
    this._historyEl.innerHTML = '';
    this._dataEl.innerHTML = '';
    this._activateTab('summary');
  }

  /** Resets to the welcome screen. */
  reset() {
    this._welcomeScreen.style.display = '';
    this._reportView.style.display = 'none';
    this._summaryEl.innerHTML = '';
    this._historyEl.innerHTML = '';
    this._dataEl.innerHTML = '';
  }

  /** Activates a tab programmatically. */
  activateTab(tabId) {
    this._activateTab(tabId);
  }

  /** @private */
  _renderMarkdown(container, md) {
    if (!md || !md.trim()) {
      container.innerHTML = `
        <div class="empty-section">
          Nenhum conteúdo disponível nesta aba.
        </div>`;
      return;
    }

    let html;
    try {
      if (window.marked) {
        html = (window.marked.parse || window.marked)(md);
      } else {
        html = `<pre style="white-space:pre-wrap;">${this._esc(md)}</pre>`;
      }
    } catch {
      html = `<pre style="white-space:pre-wrap;">${this._esc(md)}</pre>`;
    }

    container.innerHTML = html;

    // Wrap tables for horizontal touch scroll
    container.querySelectorAll('table').forEach(table => {
      if (!table.parentElement.classList.contains('table-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-wrapper';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      }
    });

    // Open external links in a new tab
    container.querySelectorAll('a[href]').forEach(a => {
      if (a.href.startsWith('http')) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }

  /** @private */
  _attachTabListeners() {
    this._tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this._activateTab(btn.dataset.tab);
      });
    });
  }

  /** @private */
  _activateTab(tabId) {
    this._tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    this._tabPanels.forEach(p => p.classList.toggle('active', p.id === `tab-${tabId}`));
    this._onTabChange?.(tabId);
  }

  /** @private */
  _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
