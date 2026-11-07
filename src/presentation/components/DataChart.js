/**
 * DataChart
 * Renders the "Dados & Gráficos" tab: interactive ECharts line chart built from
 * the asset's CSV files, metric selector, range/scale controls and raw tables.
 */
export class DataChart {
  constructor(containerId = 'chart-container') {
    this._container = document.getElementById(containerId);
    this._chart = null;
    this._data = null;
    this._sources = null;
    this._selected = new Set();
    this._scale = 'linear';
    this._range = 'max';
    this._priceByMonth = null;
    this._showPrice = true;
    this._palette = ['#58a6ff', '#3fb950', '#d29922', '#f85149', '#bc8cff', '#39c5cf', '#ff7b72', '#a5d6ff'];
  }

  /**
   * @param {{ historical?: string, additional?: string }} csv
   */
  render(csv) {
    if (!this._container) return;

    const historical = this._parseCsv(csv?.historical || '');
    const additional = this._parseCsv(csv?.additional || '');
    this._sources = { historical, additional };

    this._dispose();

    if (!historical && !additional) {
      this._container.innerHTML = `
        <div class="empty-section">Sem dados históricos (CSV) para montar o gráfico deste ativo.</div>`;
      return;
    }

    this._source = historical ? 'historical' : 'additional';
    this._data = this._sources[this._source];
    this._selected = this._pickDefaultMetrics(this._data.metrics);

    const sourceToggle = historical && additional
      ? `<div class="chart-action-group" id="chart-source">
           <button data-source="historical" class="active">Histórico</button>
           <button data-source="additional">Adicionais</button>
         </div>`
      : '';

    this._container.innerHTML = `
      <div class="chart-controls">
        <div class="chart-metrics" id="chart-metrics"></div>
        <div class="chart-actions">
          ${sourceToggle}
          <div class="chart-action-group" id="chart-range">
            <button data-range="1">1A</button>
            <button data-range="3">3A</button>
            <button data-range="5">5A</button>
            <button data-range="max" class="active">Máx</button>
          </div>
          <div class="chart-action-group" id="chart-scale">
            <button data-scale="linear" class="active">Linear</button>
            <button data-scale="log">Log</button>
          </div>
        </div>
      </div>
      <div id="main-chart" class="main-chart"></div>
      <div class="chart-note" id="chart-note" style="display:none;"></div>
      <div class="chart-tables" id="chart-tables"></div>
    `;

    this._renderMetricChips();
    this._renderTables(historical, additional);
    this._attachControls();

    // ECharts must not be initialised while the tab is hidden: it would lock
    // the canvas to a fallback width. resize() initialises it on first show.
    if (this._container.offsetParent !== null) {
      this._ensureChart();
      this._updateChart();
    }
  }

  /**
   * Adds monthly closing prices to the chart.
   * @param {Record<string, number>|null} priceByMonth - closes keyed by "YYYY-MM"
   */
  setPriceHistory(priceByMonth) {
    this._priceByMonth = priceByMonth && Object.keys(priceByMonth).length
      ? priceByMonth
      : null;

    if (!this._data) return;

    this._renderMetricChips();
    this._updateChart();
  }

  /** Disposes the chart and clears the tab. */
  clear() {
    this._dispose();
    this._sources = null;
    this._data = null;
    this._priceByMonth = null;
    this._showPrice = true;
    if (this._container) this._container.innerHTML = '';
  }

  /** Resizes the chart (call when the tab becomes visible). */
  resize() {
    if (!this._container || this._container.offsetParent === null) return;
    if (!this._ensureChart()) return;
    if (!this._data) return;

    // Re-apply the option (price chip may have arrived while the tab was hidden)
    this._updateChart();
    this._chart.resize();
  }

  /** @private */
  _dispose() {
    if (this._chart) {
      this._chart.dispose();
      this._chart = null;
    }
  }

  /**
   * Creates the ECharts instance only when the container is visible, so the
   * canvas always uses the full available width.
   * @private
   */
  _ensureChart() {
    const el = this._container?.querySelector('#main-chart');
    if (!el || !window.echarts) return false;

    el.style.width = '100%';
    el.style.height = '480px';

    if (!this._chart) {
      this._chart = window.echarts.init(el, null, { renderer: 'canvas' });
    }

    return true;
  }

  /** @private */
  _attachControls() {
    this._container.querySelectorAll('#chart-source button').forEach(btn => {
      btn.addEventListener('click', () => this._switchSource(btn.dataset.source));
    });

    this._container.querySelectorAll('#chart-range button').forEach(btn => {
      btn.addEventListener('click', () => {
        this._range = btn.dataset.range;
        this._container.querySelectorAll('#chart-range button').forEach(b => {
          b.classList.toggle('active', b === btn);
        });
        this._updateChart();
      });
    });

    this._container.querySelectorAll('#chart-scale button').forEach(btn => {
      btn.addEventListener('click', () => {
        this._scale = btn.dataset.scale;
        this._container.querySelectorAll('#chart-scale button').forEach(b => {
          b.classList.toggle('active', b === btn);
        });
        this._updateChart();
      });
    });
  }

  /** @private */
  _switchSource(source) {
    if (!this._sources?.[source]) return;

    this._source = source;
    this._data = this._sources[source];
    this._selected = this._pickDefaultMetrics(this._data.metrics);

    this._container.querySelectorAll('#chart-source button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.source === source);
    });

    this._renderMetricChips();
    this._updateChart();
  }

  /** @private */
  _renderMetricChips() {
    const host = this._container.querySelector('#chart-metrics');

    const priceChip = this._priceByMonth
      ? `<button class="metric-chip metric-chip-price${this._showPrice ? ' active' : ''}" data-price="1"
           title="Fechamento do mês de encerramento do período (ex.: 4T2024 → dez/2024)">Preço (R$)</button>`
      : '';

    host.innerHTML = priceChip + this._data.metrics.map(metric => `
      <button class="metric-chip${this._selected.has(metric.label) ? ' active' : ''}" data-label="${this._esc(metric.label)}">
        ${this._esc(metric.label)}
      </button>
    `).join('');

    const note = this._container.querySelector('#chart-note');
    if (note) {
      note.style.display = this._priceByMonth ? '' : 'none';
      note.textContent = this._priceByMonth
        ? 'Preço: fechamento mensal do mês de encerramento de cada período (ex.: 4T2024 → dez/2024).'
        : '';
    }

    host.querySelectorAll('.metric-chip[data-price]').forEach(chip => {
      chip.addEventListener('click', () => {
        this._showPrice = !this._showPrice;
        chip.classList.toggle('active', this._showPrice);
        this._updateChart();
      });
    });

    host.querySelectorAll('.metric-chip[data-label]').forEach(chip => {
      chip.addEventListener('click', () => {
        const label = chip.dataset.label;
        if (this._selected.has(label)) this._selected.delete(label);
        else this._selected.add(label);
        chip.classList.toggle('active', this._selected.has(label));
        this._updateChart();
      });
    });
  }

  /** @private */
  _updateChart() {
    if (!this._chart) return;

    const metrics = this._data.metrics.filter(m => this._selected.has(m.label));
    const logScale = this._scale === 'log';
    const priceValues = this._showPrice ? this._priceValues() : [];
    const showPrice = priceValues.some(value => value != null);

    const series = metrics.map((metric, index) => ({
      name: metric.label,
      type: 'line',
      smooth: true,
      showSymbol: false,
      connectNulls: true,
      emphasis: { focus: 'series' },
      itemStyle: { color: this._palette[index % this._palette.length] },
      data: metric.values.map(value => {
        if (value == null) return null;
        if (logScale && value <= 0) return null;
        return value;
      }),
    }));

    if (showPrice) {
      series.push({
        name: 'Preço (R$)',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 7,
        connectNulls: false,
        emphasis: { focus: 'series' },
        itemStyle: { color: '#d29922' },
        lineStyle: { width: 2, type: 'dashed' },
        data: priceValues.map(value => (logScale && value != null && value <= 0 ? null : value)),
      });
    }

    const yAxis = [
      {
        type: logScale ? 'log' : 'value',
        name: 'Indicador',
        nameTextStyle: { color: '#8b949e' },
        axisLabel: { color: '#8b949e', formatter: value => this._formatCompact(value) },
        splitLine: { lineStyle: { color: '#21262d' } },
      },
    ];

    if (showPrice) {
      yAxis.push({
        type: logScale ? 'log' : 'value',
        name: 'Preço (R$)',
        position: 'right',
        nameTextStyle: { color: '#8b949e' },
        axisLabel: { color: '#8b949e', formatter: value => this._formatPrice(value, false) },
        splitLine: { show: false },
      });
    }

    const start = this._rangeStart();

    this._chart.setOption({
      backgroundColor: 'transparent',
      color: this._palette,
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#161b22',
        borderColor: '#30363d',
        textStyle: { color: '#e6edf3' },
        formatter: params => this._tooltipFormatter(params),
      },
      legend: {
        top: 0,
        type: 'scroll',
        textStyle: { color: '#8b949e' },
      },
      grid: { left: 12, right: showPrice ? 76 : 20, bottom: 64, top: 56, containLabel: true },
      xAxis: {
        type: 'category',
        data: this._data.periods,
        axisLabel: { color: '#8b949e' },
        axisLine: { lineStyle: { color: '#30363d' } },
      },
      yAxis,
      dataZoom: [
        { type: 'inside', start, end: 100 },
        {
          type: 'slider',
          start,
          end: 100,
          height: 18,
          bottom: 8,
          textStyle: { color: '#8b949e' },
          borderColor: '#30363d',
          fillerColor: 'rgba(88,166,255,0.15)',
        },
      ],
      series,
    }, true);
  }

  /** @private */
  _priceValues() {
    if (!this._priceByMonth || !this._data) return [];
    return this._data.periods.map(label => this._priceForPeriod(label));
  }

  /**
   * Maps a period label to the monthly close of its closing month.
   * Examples: "4T2024" → 2024-12, "1T2026" → 2026-03, "6M2026" → 2026-06,
   * "2025" → 2025-12, "2T26" → 2026-06.
   * @private
   */
  _priceForPeriod(label) {
    const target = this._periodEndDate(label);
    if (!target || !this._priceByMonth) return null;

    const year = target.getFullYear();
    const month = target.getMonth() + 1;

    // Walk back a few months in case the exact month is missing.
    for (let offset = 0; offset <= 6; offset++) {
      const date = new Date(year, month - offset, 0);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (this._priceByMonth[key] != null) return this._priceByMonth[key];
    }

    return null;
  }

  /** @private */
  _periodEndDate(label) {
    const text = String(label).trim();

    let match = /^(\d)T(\d{2,4})$/i.exec(text);
    if (match) {
      const quarter = Number(match[1]);
      return new Date(this._fullYear(match[2]), quarter * 3, 0);
    }

    match = /^(\d)M(\d{4})$/i.exec(text);
    if (match) {
      return new Date(Number(match[2]), Number(match[1]), 0);
    }

    match = /^(\d{4})$/i.exec(text);
    if (match) {
      return new Date(Number(match[1]), 12, 0);
    }

    return null;
  }

  /** @private */
  _tooltipFormatter(params) {
    const list = Array.isArray(params) ? params : [params];
    if (!list.length) return '';

    const title = list[0].axisValueLabel ?? list[0].axisValue ?? '';
    const rows = list.map(item => {
      const value = item.value;
      const formatted = value == null || !Number.isFinite(value)
        ? '—'
        : (item.seriesName === 'Preço (R$)' ? this._formatPrice(value) : this._formatCompact(value));
      return `${item.marker}${item.seriesName}: ${formatted}`;
    });

    return `<div style="font-weight:600;margin-bottom:4px">${title}</div>${rows.join('<br/>')}`;
  }

  /** @private */
  _rangeStart() {
    const total = this._data.periods.length;
    if (this._range === 'max' || total <= 1) return 0;

    const years = Number(this._range);
    if (!Number.isFinite(years) || years <= 0) return 0;

    const keys = this._data.keys;
    const maxKey = keys[keys.length - 1];
    const minKey = maxKey - years * 10;
    const firstVisible = keys.findIndex(key => key >= minKey);

    if (firstVisible <= 0) return 0;
    return (firstVisible / total) * 100;
  }

  /** @private */
  _renderTables(historical, additional) {
    const host = this._container.querySelector('#chart-tables');
    const parts = [];

    if (historical) parts.push(this._tableHtml('Histórico contábil', historical));
    if (additional) parts.push(this._tableHtml('Dados adicionais', additional));

    host.innerHTML = parts.join('');
  }

  /** @private */
  _tableHtml(title, parsed) {
    const header = ['Métrica', ...parsed.periods];
    return `
      <details class="chart-table-block" ${title === 'Histórico contábil' ? 'open' : ''}>
        <summary>${this._esc(title)}</summary>
        <div class="table-wrapper">
          <table>
            <thead><tr>${header.map(h => `<th>${this._esc(h)}</th>`).join('')}</tr></thead>
            <tbody>
              ${parsed.metrics.map(metric => `
                <tr>
                  <td>${this._esc(metric.label)}</td>
                  ${metric.raw.map(value => `<td>${this._esc(value)}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </details>`;
  }

  /** @private */
  _parseCsv(text) {
    if (!text || !text.trim()) return null;

    const lines = text.trim().split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return null;

    const delimiter = lines[0].includes(';') ? ';' : ',';
    const header = lines[0].replace(/^\uFEFF/, '').split(delimiter).map(cell => cell.trim());
    const rows = lines.slice(1).map(line => line.split(delimiter).map(cell => cell.trim()));

    return this._isTransposed(header, rows)
      ? this._parseTransposedCsv(header, rows)
      : this._parseStandardCsv(header, rows);
  }

  /**
   * Detects CSVs where the first column holds periods and the header holds
   * metrics (e.g. B3SA's "trimestre,receita_total,...").
   * @private
   */
  _isTransposed(header, rows) {
    const first = String(header[0] || '').toLowerCase();
    if (/^(trimestre|per[ií]odo|periodo|data|ano|m[eê]s)$/.test(first)) return true;

    const periodRows = rows.filter(cells => this._periodKey(cells[0]) > 0);
    return rows.length >= 2 && periodRows.length === rows.length;
  }

  /** @private */
  _parseStandardCsv(header, rows) {
    const rawPeriods = header.slice(1);

    const order = rawPeriods
      .map((label, index) => ({ label, index, key: this._periodKey(label) }))
      .sort((a, b) => a.key - b.key);

    const periods = order.map(item => item.label);
    const keys = order.map(item => item.key);

    const metrics = rows.map(cells => {
      const label = cells[0];
      const raw = order.map(item => cells[item.index + 1] ?? '');
      const values = raw.map(value => this._parseNumber(value));
      return { label, raw, values };
    }).filter(metric => {
      const numeric = metric.values.filter(value => value != null).length;
      return metric.label && numeric >= 2;
    });

    if (!metrics.length) return null;
    return { periods, keys, metrics };
  }

  /** @private */
  _parseTransposedCsv(header, rows) {
    const periodRows = rows
      .map(cells => ({ label: cells[0], cells: cells.slice(1), key: this._periodKey(cells[0]) }))
      .filter(row => row.key > 0)
      .sort((a, b) => a.key - b.key);

    const periods = periodRows.map(row => row.label);
    const keys = periodRows.map(row => row.key);

    const metrics = header.slice(1).map((label, index) => {
      const raw = periodRows.map(row => row.cells[index] ?? '');
      const values = raw.map(value => this._parseNumber(value));
      return { label: this._prettifyLabel(label), raw, values };
    }).filter(metric => {
      const numeric = metric.values.filter(value => value != null).length;
      return metric.label && numeric >= 2;
    });

    if (!metrics.length) return null;
    return { periods, keys, metrics };
  }

  /** @private */
  _prettifyLabel(label) {
    return String(label).trim()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  /** @private */
  _periodKey(label) {
    const text = String(label).trim();

    let match = /^(\d)T(\d{2,4})$/i.exec(text);
    if (match) return this._fullYear(match[2]) * 10 + Number(match[1]);

    match = /^(\d)S(\d{2,4})$/i.exec(text);
    if (match) return this._fullYear(match[2]) * 10 + Number(match[1]) * 2;

    match = /^(\d)M(\d{4})$/i.exec(text);
    if (match) return Number(match[2]) * 10 + Math.ceil(Number(match[1]) / 3);

    match = /^(\d{4})$/.exec(text);
    if (match) return Number(match[1]) * 10 + 4;

    return 0;
  }

  /** @private */
  _fullYear(value) {
    const text = String(value);
    const year = Number(text);
    return text.length <= 2 ? 2000 + year : year;
  }

  /** @private */
  _parseNumber(value) {
    if (value == null) return null;

    let text = String(value).trim();
    if (!text || text === '-' || text === '—') return null;

    const lower = text.toLowerCase();
    let multiplier = 1;

    if (/\bbi\b|bilh/.test(lower)) multiplier = 1e9;
    else if (/\bmi\b|milh/.test(lower)) multiplier = 1e6;
    else if (/\bmil\b/.test(lower)) multiplier = 1e3;
    else if (/\bm\b/.test(lower)) multiplier = 1e6;

    text = text.replace(/[^\d,.\-]/g, '');
    if (!text) return null;

    // Brazilian format: "." = thousands, "," = decimal
    text = text.replace(/\./g, '').replace(',', '.');

    const number = Number(text);
    if (!Number.isFinite(number)) return null;
    return number * multiplier;
  }

  /** @private */
  _pickDefaultMetrics(metrics) {
    const preferred = metrics.filter(metric =>
      /receita|lucro|ebitda|margem|roe|roic|patrim|volume|rendimento|dividend|vacância|vacancia/i.test(metric.label)
    );

    const chosen = (preferred.length ? preferred : metrics).slice(0, 3);
    return new Set(chosen.map(metric => metric.label));
  }

  /** @private */
  _formatCompact(value) {
    if (value == null || !Number.isFinite(value)) return '—';
    const abs = Math.abs(value);

    if (abs >= 1e9) return `${(value / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} bi`;
    if (abs >= 1e6) return `${(value / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mi`;
    if (abs >= 1e3) return `${(value / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mil`;
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }

  /** @private */
  _formatPrice(value, withSymbol = true) {
    if (value == null || !Number.isFinite(value)) return '—';
    const text = value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return withSymbol ? `R$ ${text}` : text;
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
