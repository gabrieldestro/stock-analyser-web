/**
 * AskAIUseCase
 * Delegates a multi-turn conversation to the AI service, optionally streaming.
 */
export class AskAIUseCase {
  /**
   * @param {import('../domain/repositories/AIService.js').AIService} aiService
   */
  constructor(aiService) {
    this.aiService = aiService;
  }

  /**
   * @param {import('../domain/entities/ChatMessage.js').ChatMessage[]} messages
   * @param {string} [systemContext] - Extra context (e.g., the current report markdown)
   * @param {function(string): void} [onChunk] - Streaming callback
   * @returns {Promise<string>} Full response text
   */
  async execute(messages, systemContext, onChunk) {
    return this.aiService.sendMessage(messages, systemContext, onChunk);
  }
}
