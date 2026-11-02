/**
 * MarkdownViewer
 * Renders markdown content inside the main content area using window.marked.
 * Supports tabs: Summary, Historical Analysis, Data & Charts.
 */
export class MarkdownViewer {
  constructor() {
    this._summaryEl   = document.getElementById('markdown-content');
    this._historyEl   = document.getElementById('markdown-history');
    this._dataEl      = document.getElementById('markdown-data');
    this._reportView  = document.getElementById('report-view');
    this._welcomeScreen = document.getElementById('welcome-screen');

    // Tab buttons and panels
    this._tabBtns  = document.querySelectorAll('.tab-btn');
    this._tabPanels = document.querySelectorAll('.tab-panel');

    this._currentContent = null;
    this._attachTabListeners();
  }

  /**
   * Renders the markdown report, splitting into relevant sections.
   * @param {string} markdownContent - Raw markdown string
   */
  render(markdownContent) {
    this._currentContent = markdownContent;

    // Show report view, hide welcome
    this._welcomeScreen.style.display = 'none';
    this._reportView.style.display = 'flex';

    // Parse and split sections
    const sections = this._splitSections(markdownContent);

    this._renderMarkdown(this._summaryEl, sections.summary);
    this._renderMarkdown(this._historyEl, sections.history);
    this._renderMarkdown(this._dataEl, sections.data);

    // Switch to Summary tab
    this._activateTab('summary');
  }

  /**
   * Shows a loading indicator in the main area.
   */
  showLoading() {
    this._welcomeScreen.style.display = 'none';
    this._reportView.style.display = 'flex';
    this._summaryEl.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Carregando relatório...</p>
      </div>`;
    this._historyEl.innerHTML = '';
    this._dataEl.innerHTML = '';
    this._activateTab('summary');
  }

  /**
   * Shows an error message.
   * @param {string} message
   */
  showError(message) {
    this._welcomeScreen.style.display = 'none';
    this._reportView.style.display = 'flex';
    this._summaryEl.innerHTML = `
      <div class="error-state">
        <span class="error-icon">⚠️</span>
        <strong>Erro ao carregar relatório</strong>
        <p style="color: var(--text-muted); font-size: 14px;">${this._esc(message)}</p>
      </div>`;
    this._historyEl.innerHTML = '';
    this._dataEl.innerHTML = '';
    this._activateTab('summary');
  }

  /**
   * Resets to the welcome screen.
   */
  reset() {
    this._welcomeScreen.style.display = '';
    this._reportView.style.display = 'none';
    this._currentContent = null;
  }

  /** @private */
  _renderMarkdown(container, md) {
    if (!md || !md.trim()) {
      container.innerHTML = `
        <div style="padding:40px 28px; color: var(--text-muted); font-size:14px; text-align:center;">
          Nenhum conteúdo disponível nesta seção.
        </div>`;
      return;
    }

    // Use window.marked (loaded via CDN script tag)
    let html;
    try {
      if (window.marked) {
        // marked v4+ uses marked.parse(); older uses marked()
        html = (window.marked.parse || window.marked)(md);
      } else {
        // Fallback: plain text in a <pre>
        html = `<pre style="white-space:pre-wrap;">${this._esc(md)}</pre>`;
      }
    } catch (e) {
      html = `<pre style="white-space:pre-wrap;">${this._esc(md)}</pre>`;
    }

    container.innerHTML = html;

    // Wrap tables in a scrollable div for horizontal touch scroll
    container.querySelectorAll('table').forEach(table => {
      if (!table.parentElement.classList.contains('table-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-wrapper';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      }
    });

    // Open external links in new tab
    container.querySelectorAll('a[href]').forEach(a => {
      if (a.href.startsWith('http')) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }

  /**
   * Splits the full markdown into logical sections based on heading keywords.
   * @param {string} md
   * @returns {{ summary: string, history: string, data: string }}
   * @private
   */
  _splitSections(md) {
    const lines = md.split('\n');
    const sections = { summary: [], history: [], data: [] };
    let current = 'summary';

    // Heading keywords that signal section changes
    const historyKeywords = /análise hist|histórico|evolução|crises|desempenho/i;
    const dataKeywords    = /dados|gráfico|comparativo|indicadores|métricas|tabela|portfólio/i;

    for (const line of lines) {
      if (/^#{1,2} /.test(line)) {
        if (dataKeywords.test(line)) {
          current = 'data';
        } else if (historyKeywords.test(line)) {
          current = 'history';
        }
      }
      sections[current].push(line);
    }

    // Always put the title in summary
    return {
      summary: sections.summary.join('\n'),
      history: sections.history.join('\n') || sections.summary.join('\n'),
      data:    sections.data.join('\n'),
    };
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
  }

  /** @private */
  _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
