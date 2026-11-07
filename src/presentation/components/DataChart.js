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
    this._selected = new Set();
    this._scale = 'linear';
    this._range = 'max';
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
      <div class="chart-tables" id="chart-tables"></div>
    `;

    this._renderMetricChips();
    this._renderTables(historical, additional);
    this._attachControls();
    this._initChart();
    this._updateChart();
  }

  /** Disposes the chart and clears the tab. */
  clear() {
    this._dispose();
    if (this._container) this._container.innerHTML = '';
  }

  /** Resizes the chart (call when the tab becomes visible). */
  resize() {
    this._chart?.resize();
  }

  /** @private */
  _dispose() {
    if (this._chart) {
      this._chart.dispose();
      this._chart = null;
    }
  }

  /** @private */
  _initChart() {
    const el = this._container?.querySelector('#main-chart');
    if (!el || !window.echarts) return;
    this._chart = window.echarts.init(el, null, {
      renderer: 'canvas',
      width: el.clientWidth || 800,
      height: 420,
    });
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
    host.innerHTML = this._data.metrics.map(metric => `
      <button class="metric-chip${this._selected.has(metric.label) ? ' active' : ''}" data-label="${this._esc(metric.label)}">
        ${this._esc(metric.label)}
      </button>
    `).join('');

    host.querySelectorAll('.metric-chip').forEach(chip => {
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

    const start = this._rangeStart();

    this._chart.setOption({
      backgroundColor: 'transparent',
      color: this._palette,
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#161b22',
        borderColor: '#30363d',
        textStyle: { color: '#e6edf3' },
        valueFormatter: value => this._formatCompact(value),
      },
      legend: {
        top: 0,
        type: 'scroll',
        textStyle: { color: '#8b949e' },
      },
      grid: { left: 12, right: 20, bottom: 64, top: 48, containLabel: true },
      xAxis: {
        type: 'category',
        data: this._data.periods,
        axisLabel: { color: '#8b949e' },
        axisLine: { lineStyle: { color: '#30363d' } },
      },
      yAxis: {
        type: logScale ? 'log' : 'value',
        axisLabel: { color: '#8b949e', formatter: value => this._formatCompact(value) },
        splitLine: { lineStyle: { color: '#21262d' } },
      },
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
    const header = lines[0].split(delimiter).map(cell => cell.trim());
    const rawPeriods = header.slice(1);

    const order = rawPeriods
      .map((label, index) => ({ label, index, key: this._periodKey(label) }))
      .sort((a, b) => a.key - b.key);

    const periods = order.map(item => item.label);
    const keys = order.map(item => item.key);

    const metrics = lines.slice(1).map(line => {
      const cells = line.split(delimiter).map(cell => cell.trim());
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
  _periodKey(label) {
    const text = String(label).trim();

    let match = /^(\d)T(\d{4})$/i.exec(text);
    if (match) return Number(match[2]) * 10 + Number(match[1]);

    match = /^(\d)S(\d{4})$/i.exec(text);
    if (match) return Number(match[2]) * 10 + Number(match[1]) * 2;

    match = /^(\d)M(\d{4})$/i.exec(text);
    if (match) return Number(match[2]) * 10 + Math.ceil(Number(match[1]) / 3);

    match = /^(\d{4})$/.exec(text);
    if (match) return Number(match[1]) * 10 + 4;

    return 0;
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
  _esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
