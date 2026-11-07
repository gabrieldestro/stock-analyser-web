/**
 * QuotePanel
 * Renders the current B3 quotation card inside the "Dados & Gráficos" tab.
 * Purely presentational: receives a fetch callback and displays the result.
 */
export class QuotePanel {
  constructor() {
    this._root = document.getElementById('quote-panel');
    this._ticker = null;
    this._fetchFn = null;
    this._requestId = 0;
  }

  /**
   * Loads and renders the quotation for a ticker.
   * @param {string} ticker
   * @param {function(string, {force?: boolean}): Promise<import('../../domain/entities/Quote.js').Quote>} fetchFn
   */
  load(ticker, fetchFn) {
    this._ticker = ticker;
    this._fetchFn = fetchFn;
    this._fetchAndRender(false);
  }

  /** Clears the panel (no active asset). */
  clear() {
    this._ticker = null;
    this._fetchFn = null;
    this._requestId++;
    if (this._root) {
      this._root.innerHTML = '';
      this._root.style.display = 'none';
    }
  }

  /** @private */
  async _fetchAndRender(force) {
    if (!this._root || !this._ticker || !this._fetchFn) return;

    const requestId = ++this._requestId;
    this._renderLoading();

    try {
      const quote = await this._fetchFn(this._ticker, { force });
      if (requestId !== this._requestId) return;
      this._renderQuote(quote);
    } catch (err) {
      if (requestId !== this._requestId) return;
      this._renderError(err.message || 'Cotação indisponível.');
    }
  }

  /** @private */
  _renderLoading() {
    this._root.style.display = 'block';
    this._root.innerHTML = `
      <div class="quote-card quote-loading">
        <span class="spinner-sm"></span>
        <span>Carregando cotação de ${this._esc(this._ticker)}...</span>
      </div>`;
  }

  /** @private */
  _renderError(message) {
    this._root.style.display = 'block';
    this._root.innerHTML = `
      <div class="quote-card quote-error">
        <span>Cotação indisponível para <strong>${this._esc(this._ticker)}</strong>.</span>
        <button class="quote-refresh" id="quote-refresh-btn" title="Tentar novamente">Tentar novamente</button>
        <span class="quote-error-detail">${this._esc(message)}</span>
      </div>`;

    this._root.querySelector('#quote-refresh-btn')?.addEventListener('click', () => {
      this._fetchAndRender(true);
    });
  }

  /** @private */
  _renderQuote(quote) {
    this._root.style.display = 'block';

    const change = quote.changePercent;
    const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
    const changeLabel = change == null ? '—' : `${change > 0 ? '+' : ''}${this._num(change, 2)}%`;

    const stats = [
      ['Abertura', this._money(quote.open)],
      ['Máxima', this._money(quote.high)],
      ['Mínima', this._money(quote.low)],
      ['Média', this._money(quote.average)],
      ['Volume', quote.volume == null ? '—' : this._num(quote.volume, 0)],
    ];

    this._root.innerHTML = `
      <div class="quote-card">
        <div class="quote-head">
          <div class="quote-heading">
            <span class="quote-label">Cotação B3</span>
            <span class="quote-ticker">${this._esc(quote.ticker)}</span>
          </div>
          <button class="quote-refresh" id="quote-refresh-btn" title="Atualizar cotação">Atualizar</button>
        </div>

        <div class="quote-main">
          <span class="quote-price">${this._money(quote.price)}</span>
          <span class="quote-change ${changeClass}">${changeLabel}</span>
        </div>

        <div class="quote-name">${this._esc(quote.name || '')}</div>

        <div class="quote-grid">
          ${stats.map(([label, value]) => `
            <div class="quote-stat">
              <span class="quote-stat-label">${label}</span>
              <span class="quote-stat-value">${value}</span>
            </div>
          `).join('')}
        </div>

        <div class="quote-foot">
          Fonte: ${this._esc(quote.source || 'B3')}
          ${quote.updatedAt ? ` · Atualizado em ${this._esc(this._formatDateTime(quote.updatedAt))}` : ''}
        </div>
      </div>`;

    this._root.querySelector('#quote-refresh-btn')?.addEventListener('click', () => {
      this._fetchAndRender(true);
    });
  }

  /** @private */
  _money(value) {
    if (value == null || !Number.isFinite(value)) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  /** @private */
  _num(value, digits = 2) {
    if (value == null || !Number.isFinite(value)) return '—';
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  }

  /** @private */
  _formatDateTime(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(value));
    if (!match) return value;
    const [, y, mo, d, h, mi] = match;
    return `${d}/${mo}/${y} ${h}:${mi}`;
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
