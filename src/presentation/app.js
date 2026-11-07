/**
 * app.js — Main orchestrator for Stock Exchange Analyser Web
 *
 * Wires together all layers:
 *   Infrastructure → Application → Presentation
 *
 * Startup flow:
 * 1. Read settings from LocalStorage
 * 2. If no settings → auto-open SettingsModal
 * 3. If settings present → build repository + list reports
 * 4. Report selection → load full content + render markdown
 * 5. AI button → open ChatDrawer with current report context
 * 6. Settings button → open SettingsModal
 */

// ── Infrastructure ──────────────────────────────────────────────────────────
import { LocalStorageSettings }    from '../infrastructure/LocalStorageSettings.js';
import { GitHubReportRepository }  from '../infrastructure/GitHubReportRepository.js';
import { MockReportRepository }    from '../infrastructure/MockReportRepository.js';
import { OpenRouterService }        from '../infrastructure/OpenRouterService.js';
import { B3QuoteRepository }        from '../infrastructure/B3QuoteRepository.js';

// ── Application ──────────────────────────────────────────────────────────────
import { ListReportsUseCase }       from '../application/ListReportsUseCase.js';
import { GetReportDetailsUseCase }  from '../application/GetReportDetailsUseCase.js';
import { AskAIUseCase }             from '../application/AskAIUseCase.js';
import { ManageSettingsUseCase }    from '../application/ManageSettingsUseCase.js';
import { GetQuoteUseCase }           from '../application/GetQuoteUseCase.js';

// ── Presentation ─────────────────────────────────────────────────────────────
import { Sidebar }         from './components/Sidebar.js';
import { MarkdownViewer }  from './components/MarkdownViewer.js';
import { ChatDrawer }      from './components/ChatDrawer.js';
import { SettingsModal }   from './components/SettingsModal.js';
import { QuotePanel }       from './components/QuotePanel.js';
import { DataChart }        from './components/DataChart.js';

// ── App State ─────────────────────────────────────────────────────────────────
const state = {
  currentReport: null,   // Report entity currently displayed
  isMockMode: new URLSearchParams(window.location.search).get('mock') === 'true',
};

// ── Infrastructure instances ──────────────────────────────────────────────────
const settingsStorage    = new LocalStorageSettings();
const manageSettingsUC   = new ManageSettingsUseCase(settingsStorage);

// ── Presentation instances ────────────────────────────────────────────────────
const sidebar        = new Sidebar();
const markdownViewer = new MarkdownViewer();
const quotePanel     = new QuotePanel();
const dataChart      = new DataChart();

// The chart needs a resize once its tab becomes visible.
markdownViewer.onTabChange((tabId) => {
  if (tabId === 'data') {
    window.requestAnimationFrame(() => dataChart.resize());
  }
});

// ── Quote (B3 public API — no token required) ─────────────────────────────────
const getQuoteUC = new GetQuoteUseCase(new B3QuoteRepository());

// Chat / AI (lazy-initialised after settings are known)
let askAIUseCase = null;
let chatDrawer   = null;

// Settings modal (with test-connection callback)
const settingsModal = new SettingsModal(
  manageSettingsUC,
  (newSettings) => handleSettingsSaved(newSettings),
  (settings)    => testGitHubConnection(settings),
);

// ── Bootstrap ────────────────────────────────────────────────────────────────
async function boot() {
  wireNavbarButtons();
  wireSidebarOverlay();

  // Responsive: start with sidebar closed on mobile
  if (window.innerWidth <= 768) {
    sidebar.close();
  }

  const settings = manageSettingsUC.getSettings();

  if (state.isMockMode) {
    // Demo mode — no credentials needed
    await initRepository(null);
  } else if (!settings.githubToken || !settings.owner || !settings.repo) {
    // First run — show settings modal
    sidebar.showError('Configure suas credenciais para começar.');
    settingsModal.show();
  } else {
    await initRepository(settings);
  }
}

// ── Repository & Report Loading ───────────────────────────────────────────────
async function initRepository(settings) {
  let reportRepository;

  if (state.isMockMode) {
    reportRepository = new MockReportRepository();
    console.info('[app] Modo demo (mock) ativo.');
  } else {
    reportRepository = new GitHubReportRepository(
      settings.githubToken,
      settings.owner,
      settings.repo,
      settings.basePath || 'relatorios',
    );
  }

  // Wire AI service
  if (settings?.openrouterKey) {
    const aiService  = new OpenRouterService(settings.openrouterKey, settings.openrouterModel || 'deepseek/deepseek-chat');
    askAIUseCase     = new AskAIUseCase(aiService);
    chatDrawer       = new ChatDrawer(askAIUseCase);
  } else {
    askAIUseCase = null;
    chatDrawer = null;
  }

  // Enable/disable AI button
  document.getElementById('btn-ai').disabled = !askAIUseCase;

  // Load reports list
  await loadReportsList(reportRepository);

  // Wire sidebar selection
  sidebar.onSelect(async (report) => {
    await loadReport(report, reportRepository);
  });
}

async function loadReportsList(reportRepository) {
  sidebar.showLoading();
  try {
    const listUC  = new ListReportsUseCase(reportRepository);
    const reports = await listUC.execute();
    sidebar.render(reports);
  } catch (err) {
    console.error('[app] Erro ao listar relatórios:', err);
    sidebar.showError(err.message || 'Falha ao carregar relatórios.');
  }
}

async function loadReport(reportSummary, reportRepository) {
  markdownViewer.showLoading();
  dataChart.clear();
  quotePanel.clear();
  state.currentReport = null;

  try {
    const detailsUC = new GetReportDetailsUseCase(reportRepository);
    const report    = await detailsUC.execute(reportSummary.id);
    state.currentReport = report;

    // Header
    renderAssetHeader(report);

    // Update the sidebar label with the full asset name
    if (report.name) sidebar.updateAssetName(report.id, report.name);

    // Tabs (summary / history / data markdown)
    markdownViewer.render(report);

    // Data tab chart + tables
    dataChart.render(report.csv);

    // Quote is independent from the report content — load it in parallel.
    const ticker = await resolveQuoteTicker(report);
    if (ticker) {
      quotePanel.load(ticker, (symbol, options) => getQuoteUC.execute(symbol, options));
    } else {
      quotePanel.clear();
    }

    // Enable AI button if AI is configured
    document.getElementById('btn-ai').disabled = !askAIUseCase;

  } catch (err) {
    console.error('[app] Erro ao carregar ativo:', err);
    markdownViewer.showError(err.message || 'Não foi possível carregar o ativo.');
  }
}

function renderAssetHeader(report) {
  const header = document.getElementById('asset-header');
  if (!header) return;

  header.style.display = 'flex';
  document.getElementById('asset-title').textContent = report.ticker || report.title;
  document.getElementById('asset-name').textContent = report.name || '';

  const badge = document.getElementById('asset-category');
  if (badge) {
    const labels = { acoes: 'Ação', fiis: 'FII', outros: 'Ativo' };
    badge.textContent = labels[report.category] || 'Ativo';
    badge.style.display = '';
  }
}

function hideAssetHeader() {
  const header = document.getElementById('asset-header');
  if (header) header.style.display = 'none';
}

// ── Settings Handling ─────────────────────────────────────────────────────────
async function handleSettingsSaved(newSettings) {
  if (!newSettings) {
    // Settings cleared — reset to initial state
    markdownViewer.reset();
    dataChart.clear();
    quotePanel.clear();
    hideAssetHeader();
    sidebar.showError('Configure suas credenciais para começar.');
    askAIUseCase = null;
    chatDrawer = null;
    document.getElementById('btn-ai').disabled = true;
    return;
  }

  if (state.isMockMode) return; // In mock mode, ignore settings

  await initRepository(newSettings);
}

async function testGitHubConnection(settings) {
  const repo = new GitHubReportRepository(
    settings.githubToken,
    settings.owner,
    settings.repo,
    settings.basePath || 'relatorios',
  );
  return repo.testConnection();
}

// ── Navbar Wiring ─────────────────────────────────────────────────────────────
function wireNavbarButtons() {
  // Hamburger — toggle sidebar
  document.getElementById('btn-hamburger').addEventListener('click', () => {
    sidebar.toggle();
  });

  // Settings button
  document.getElementById('btn-settings').addEventListener('click', () => {
    settingsModal.show();
  });

  // AI Chat button
  document.getElementById('btn-ai').addEventListener('click', () => {
    if (!askAIUseCase) {
      alert('Configure a chave do OpenRouter nas Configurações para usar o chat IA.');
      settingsModal.show();
      return;
    }
    if (!state.currentReport) {
      alert('Selecione um relatório antes de abrir o chat IA.');
      return;
    }
    chatDrawer.open(buildReportContext(state.currentReport));
  });
}

function buildReportContext(report) {
  const content = report?.content || {};
  return [content.summary, content.history, content.data]
    .filter(part => part && part.trim())
    .join('\n\n---\n\n');
}

function wireSidebarOverlay() {
  // Mobile overlay click → close sidebar
  document.getElementById('sidebar-overlay').addEventListener('click', () => {
    sidebar.close();
  });

  // Responsive handler
  window.addEventListener('resize', () => {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) {
      // On desktop: ensure overlay is hidden regardless
      document.getElementById('sidebar-overlay').classList.remove('visible');
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Resolves a valid B3 ticker for the quote panel. Some summary headings only
 * contain the base code (e.g. "ABEV"), so try the common suffixes.
 * @param {import('../domain/entities/Report.js').Report} report
 * @returns {Promise<string|null>}
 */
async function resolveQuoteTicker(report) {
  const base = extractTicker(report);
  if (!base) return null;

  if (/^[A-Z][A-Z0-9]{3,5}\d{1,2}$/.test(base)) return base;

  for (const candidate of [`${base}3`, `${base}4`, `${base}11`]) {
    try {
      await getQuoteUC.execute(candidate);
      return candidate;
    } catch {
      // try the next suffix
    }
  }

  return null;
}

/**
 * Derives the B3 ticker from the loaded asset. The repository already parses
 * it from the summary heading (e.g. "WEGE3"), so fall back to the title/path.
 * @param {import('../domain/entities/Report.js').Report} report
 * @returns {string|null}
 */
function extractTicker(report) {
  if (!report) return null;

  if (report.ticker) return String(report.ticker).toUpperCase();

  const fromTitle = /\(([A-Z][A-Z0-9]{3,5}\d{1,2})\)/i.exec(report.title || '');
  if (fromTitle) return fromTitle[1].toUpperCase();

  const base = String(report.path || report.id || '')
    .split('/')
    .pop()
    .replace(/\.md$/i, '');

  const fromFile = /^([A-Z][A-Z0-9]{3,5}\d{1,2})$/i.exec(base);
  return fromFile ? fromFile[1].toUpperCase() : null;
}

// ── Start ─────────────────────────────────────────────────────────────────────
boot().catch(err => {
  console.error('[app] Erro fatal na inicialização:', err);
});
