/**
 * AIService — Abstract base class / contract
 * Concrete implementations (e.g., OpenRouterService) must override sendMessage().
 */
export class AIService {
  /**
   * Sends a list of messages to the AI and optionally streams the response.
   *
   * @param {import('../entities/ChatMessage.js').ChatMessage[]} messages
   *   Conversation history (role + content objects).
   * @param {string} [systemContext]
   *   Optional extra context injected as a system message (e.g., report content).
   * @param {function(string): void} [onChunk]
   *   Callback invoked with each streaming text delta.
   * @returns {Promise<string>} The full assembled response text.
   */
  async sendMessage(messages, systemContext, onChunk) {
    throw new Error('Não implementado: sendMessage()');
  }
}
