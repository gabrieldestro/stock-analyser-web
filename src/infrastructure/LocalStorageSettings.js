/**
 * LocalStorageSettings
 * Persists app configuration in the browser's localStorage as JSON.
 *
 * Settings shape:
 * {
 *   githubToken: string,
 *   owner: string,
 *   repo: string,
 *   basePath: string,       // default: 'relatorios'
 *   openrouterKey: string,
 *   openrouterModel: string // default: 'deepseek/deepseek-chat'
 * }
 */
export class LocalStorageSettings {
  static KEY = 'sea_settings';

  /**
   * Returns stored settings or an empty object if nothing is stored.
   * @returns {object}
   */
  getSettings() {
    try {
      const raw = localStorage.getItem(LocalStorageSettings.KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  /**
   * Merges and persists settings.
   * @param {object} settings
   */
  saveSettings(settings) {
    try {
      const current = this.getSettings();
      const merged = { ...current, ...settings };
      localStorage.setItem(LocalStorageSettings.KEY, JSON.stringify(merged));
    } catch (err) {
      console.error('[LocalStorageSettings] Erro ao salvar:', err);
    }
  }

  /**
   * Removes all stored settings.
   */
  clearSettings() {
    try {
      localStorage.removeItem(LocalStorageSettings.KEY);
    } catch (err) {
      console.error('[LocalStorageSettings] Erro ao limpar:', err);
    }
  }

  /**
   * Returns true if essential settings are present.
   * @returns {boolean}
   */
  isConfigured() {
    const s = this.getSettings();
    return !!(s.githubToken && s.owner && s.repo);
  }
}
