import { ManageSettingsUseCase } from '../../application/ManageSettingsUseCase.js';

/**
 * SettingsModal
 * UI component that manages the configuration modal.
 * Rendered as dynamic HTML injected into #settings-modal-root.
 */
export class SettingsModal {
  /**
   * @param {ManageSettingsUseCase} manageSettingsUseCase
   * @param {function(object): void} onSave  - Called with the new settings after save
   * @param {function(): Promise<boolean>} testConnectionFn - Called to test GitHub connection
   */
  constructor(manageSettingsUseCase, onSave, testConnectionFn) {
    this.useCase = manageSettingsUseCase;
    this.onSave = onSave;
    this.testConnectionFn = testConnectionFn;
    this._root = document.getElementById('settings-modal-root');
    this._rendered = false;
  }

  /** Show the modal (renders it first if needed). */
  show() {
    if (!this._rendered) this._render();
    const backdrop = this._root.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.style.display = 'flex';
      this._populateFields();
    }
  }

  /** Hide the modal. */
  hide() {
    const backdrop = this._root.querySelector('.modal-backdrop');
    if (backdrop) backdrop.style.display = 'none';
  }

  /** @private */
  _render() {
    this._root.innerHTML = `
      <div class="modal-backdrop" style="display:none;" id="settings-backdrop">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-header">
            <span class="modal-title" id="modal-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;vertical-align:middle">
                <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2"/>
              </svg>
              Configurações
            </span>
            <button class="btn-icon" id="modal-close" aria-label="Fechar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="modal-body">
            <!-- GitHub Section -->
            <div class="form-section">
              <span class="section-label">🔒 GitHub (Repositório Privado)</span>

              <div class="form-group">
                <label for="input-github-token">Token de Acesso Pessoal</label>
                <input type="password" id="input-github-token" class="form-input"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  autocomplete="new-password" spellcheck="false" />
                <span class="form-hint">Permissões necessárias: <code>repo</code> (Contents: read)</span>
              </div>

              <div class="form-group">
                <label for="input-owner">Owner (usuário ou organização)</label>
                <input type="text" id="input-owner" class="form-input"
                  placeholder="seu-usuario-github"
                  autocomplete="off" spellcheck="false" />
              </div>

              <div class="form-group">
                <label for="input-repo">Repositório</label>
                <input type="text" id="input-repo" class="form-input"
                  placeholder="meu-repositorio-privado"
                  autocomplete="off" spellcheck="false" />
              </div>

              <div class="form-group">
                <label for="input-base-path">Pasta de relatórios</label>
                <input type="text" id="input-base-path" class="form-input"
                  placeholder="relatorios"
                  autocomplete="off" spellcheck="false" />
                <span class="form-hint">Caminho dentro do repositório onde estão os arquivos .md</span>
              </div>

              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <button class="btn btn-secondary" id="btn-test-connection" style="min-width:160px">
                  Testar Conexão
                </button>
                <span id="connection-status"></span>
              </div>
            </div>

            <!-- OpenRouter Section -->
            <div class="form-section">
              <span class="section-label">🤖 OpenRouter (Chat IA)</span>

              <div class="form-group">
                <label for="input-openrouter-key">Chave de API</label>
                <input type="password" id="input-openrouter-key" class="form-input"
                  placeholder="sk-or-xxxxxxxxxxxxxxxxxxxx"
                  autocomplete="new-password" spellcheck="false" />
                <span class="form-hint">Obtenha em <strong>openrouter.ai/keys</strong></span>
              </div>

              <div class="form-group">
                <label for="input-model">Modelo</label>
                <input type="text" id="input-model" class="form-input"
                  placeholder="deepseek/deepseek-chat"
                  autocomplete="off" spellcheck="false" />
                <span class="form-hint">Exemplos: <code>deepseek/deepseek-chat</code>, <code>google/gemini-flash-1.5</code>, <code>anthropic/claude-3-haiku</code></span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-danger" id="btn-clear-settings">
              Limpar Tudo
            </button>
            <div style="flex:1"></div>
            <button class="btn btn-secondary" id="btn-cancel-settings">
              Cancelar
            </button>
            <button class="btn btn-primary" id="btn-save-settings">
              Salvar
            </button>
          </div>
        </div>
      </div>
    `;

    this._rendered = true;
    this._attachEvents();
  }

  /** @private */
  _attachEvents() {
    // Close / Cancel
    const closeModal = () => this.hide();
    this._root.querySelector('#modal-close').addEventListener('click', closeModal);
    this._root.querySelector('#btn-cancel-settings').addEventListener('click', closeModal);

    // Click outside
    this._root.querySelector('#settings-backdrop').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const backdrop = this._root.querySelector('.modal-backdrop');
        if (backdrop && backdrop.style.display !== 'none') closeModal();
      }
    });

    // Save
    this._root.querySelector('#btn-save-settings').addEventListener('click', () => this._handleSave());

    // Clear
    this._root.querySelector('#btn-clear-settings').addEventListener('click', () => this._handleClear());

    // Test connection
    this._root.querySelector('#btn-test-connection').addEventListener('click', () => this._handleTestConnection());
  }

  /** @private */
  _populateFields() {
    const s = this.useCase.getSettings();
    this._setValue('input-github-token', s.githubToken || '');
    this._setValue('input-owner', s.owner || '');
    this._setValue('input-repo', s.repo || '');
    this._setValue('input-base-path', s.basePath || 'relatorios');
    this._setValue('input-openrouter-key', s.openrouterKey || '');
    this._setValue('input-model', s.openrouterModel || 'deepseek/deepseek-chat');
    this._root.querySelector('#connection-status').innerHTML = '';
  }

  /** @private */
  _readFields() {
    return {
      githubToken:     this._getValue('input-github-token'),
      owner:           this._getValue('input-owner'),
      repo:            this._getValue('input-repo'),
      basePath:        this._getValue('input-base-path') || 'relatorios',
      openrouterKey:   this._getValue('input-openrouter-key'),
      openrouterModel: this._getValue('input-model') || 'deepseek/deepseek-chat',
    };
  }

  /** @private */
  _handleSave() {
    const settings = this._readFields();
    this.useCase.saveSettings(settings);
    this.onSave?.(settings);
    this.hide();
  }

  /** @private */
  _handleClear() {
    if (!confirm('Tem certeza que deseja apagar todas as configurações?')) return;
    this.useCase.clearSettings();
    this._populateFields();
    this.onSave?.(null);
  }

  /** @private */
  async _handleTestConnection() {
    const settings = this._readFields();
    this.useCase.saveSettings(settings); // Save first so repo can be constructed

    const statusEl = this._root.querySelector('#connection-status');
    const btn = this._root.querySelector('#btn-test-connection');

    statusEl.innerHTML = `
      <span class="connection-badge testing">
        <span class="spinner-sm"></span>
        Testando...
      </span>`;
    btn.disabled = true;

    try {
      await this.testConnectionFn?.(settings);
      statusEl.innerHTML = `<span class="connection-badge success">✓ Conexão bem-sucedida</span>`;
    } catch (err) {
      statusEl.innerHTML = `<span class="connection-badge error">✗ ${err.message || 'Falha na conexão'}</span>`;
    } finally {
      btn.disabled = false;
    }
  }

  /** @private */
  _getValue(id) {
    return this._root.querySelector(`#${id}`)?.value?.trim() || '';
  }

  /** @private */
  _setValue(id, value) {
    const el = this._root.querySelector(`#${id}`);
    if (el) el.value = value;
  }
}
