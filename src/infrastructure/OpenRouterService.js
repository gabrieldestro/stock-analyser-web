import { AIService } from '../domain/repositories/AIService.js';

/**
 * OpenRouterService
 * Calls the OpenRouter API with streaming support (SSE via ReadableStream).
 */
export class OpenRouterService extends AIService {
  static BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

  /**
   * @param {string} apiKey - OpenRouter API key
   * @param {string} model  - Model identifier (default: deepseek/deepseek-chat)
   */
  constructor(apiKey, model = 'deepseek/deepseek-chat') {
    super();
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Sends messages to the AI with optional streaming.
   *
   * @param {import('../domain/entities/ChatMessage.js').ChatMessage[]} messages
   * @param {string} [systemContext] - Injected as a system message before the conversation
   * @param {function(string): void} [onChunk] - Called for each text delta in streaming
   * @returns {Promise<string>} Full assembled response
   */
  async sendMessage(messages, systemContext, onChunk) {
    // Build the messages array for the API
    const apiMessages = [];

    if (systemContext) {
      apiMessages.push({
        role: 'system',
        content: `Você é um analista financeiro especializado. Use o relatório abaixo como contexto para responder perguntas do usuário.\n\n---\n${systemContext}\n---`,
      });
    }

    // Append conversation history
    for (const msg of messages) {
      if (msg.role !== 'system') {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    const resp = await fetch(OpenRouterService.BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com',
        'X-Title': 'Stock Exchange Analyser',
      },
      body: JSON.stringify({
        model: this.model,
        messages: apiMessages,
        stream: true,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`OpenRouter erro ${resp.status}: ${errText || resp.statusText}`);
    }

    // Stream parsing
    const reader = resp.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by "\n\n"
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete last line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json?.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              onChunk?.(delta);
            }
          } catch {
            // Skip malformed SSE frames
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullText;
  }
}
