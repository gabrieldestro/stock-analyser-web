/**
 * ChatMessage Entity
 * Represents a single message in a conversation with the AI.
 */
export class ChatMessage {
  /**
   * @param {object} params
   * @param {'user'|'assistant'|'system'} params.role - Message role
   * @param {string} params.content                   - Message text
   * @param {string} [params.timestamp]               - ISO timestamp (defaults to now)
   */
  constructor({ role, content, timestamp }) {
    this.role = role; // 'user' | 'assistant' | 'system'
    this.content = content;
    this.timestamp = timestamp || new Date().toISOString();
  }
}
