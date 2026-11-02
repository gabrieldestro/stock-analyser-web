/**
 * ManageSettingsUseCase
 * CRUD operations for user settings (stored via a settings storage adapter).
 */
export class ManageSettingsUseCase {
  /**
   * @param {import('../infrastructure/LocalStorageSettings.js').LocalStorageSettings} settingsStorage
   */
  constructor(settingsStorage) {
    this.settingsStorage = settingsStorage;
  }

  /**
   * Returns the stored settings object, or an empty object if none.
   * @returns {object}
   */
  getSettings() {
    return this.settingsStorage.getSettings();
  }

  /**
   * Persists the settings object.
   * @param {object} settings
   */
  saveSettings(settings) {
    this.settingsStorage.saveSettings(settings);
  }

  /**
   * Removes all stored settings.
   */
  clearSettings() {
    this.settingsStorage.clearSettings();
  }
}
