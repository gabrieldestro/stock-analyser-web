import { AskAIUseCase } from '../../application/AskAIUseCase.js';
import { ChatMessage } from '../../domain/entities/ChatMessage.js';

/**
 * ChatDrawer
 * Sliding panel from the right for AI-powered chat about the current report.
 */
export class ChatDrawer {
  static SUGGESTIONS = [
    'Quais os maiores riscos?',
    'Resuma a evolução do endividamento',
    'Qual o histórico em crises?',
    'Qual sua avaliação geral?',
    'Compare com o setor',
  ];

  /**
   * @param {AskAIUseCase} askAIUseCase
   */
  constructor(askAIUseCase) {
    this.askAIUseCase = askAIUseCase;
    this._root = document.getElementById('chat-drawer-root');
    this._messages = []; // ChatMessage[]
    this._reportContext = null;
    this._isLoading = false;
    this._rendered = false;
  }

  /**
   * Opens the drawer with context from the current report.
   * @param {string} reportContent - Markdown content of the current report
   */
  open(reportContent) {
    if (!this._rendered) this._render();
    this._reportContext = reportContent;

    const drawer = this._root.querySelector('.chat-drawer');
    drawer.classList.add('open');

    // Focus the input
    setTimeout(() => {
      this._root.querySelector('.chat-input')?.focus();
    }, 300);
  }

  /** Closes the drawer. */
  close() {
    const drawer = this._root.querySelector('.chat-drawer');
    drawer?.classList.remove('open');
  }

  /** @private */
  _render() {
    this._root.innerHTML = `
      <div class="chat-drawer" role="complementary" aria-label="Chat com IA">
        <div class="chat-header">
          <span class="chat-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Chat com IA
          </span>
          <div style="display:flex;gap:4px;">
            <button class="btn-icon" id="chat-clear" title="Limpar conversa">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
              </svg>
            </button>
            <button class="btn-icon" id="chat-close" aria-label="Fechar chat">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="chat-messages" id="chat-messages">
          <div class="chat-message assistant">
            <div class="chat-bubble">
              👋 Olá! Sou seu assistente de análise financeira. Farei perguntas sobre o relatório atual. Como posso ajudar?
            </div>
            <span class="chat-message-time">${this._formatTime(new Date())}</span>
          </div>
        </div>

        <div class="chat-suggestions" id="chat-suggestions">
          ${ChatDrawer.SUGGESTIONS.map(s => `
            <button class="chip" data-suggestion="${this._esc(s)}">${this._esc(s)}</button>
          `).join('')}
        </div>

        <div class="chat-input-area">
          <textarea
            class="chat-input"
            placeholder="Pergunte sobre o relatório..."
            rows="1"
            aria-label="Mensagem para IA"
          ></textarea>
          <button class="btn btn-primary" id="chat-send" style="align-self:flex-end; padding: 0 16px;" aria-label="Enviar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    this._rendered = true;
    this._attachEvents();
  }

  /** @private */
  _attachEvents() {
    // Close
    this._root.querySelector('#chat-close').addEventListener('click', () => this.close());

    // Clear conversation
    this._root.querySelector('#chat-clear').addEventListener('click', () => this._clearConversation());

    // Send button
    this._root.querySelector('#chat-send').addEventListener('click', () => this._handleSend());

    // Enter to send (Shift+Enter for newline)
    const inputEl = this._root.querySelector('.chat-input');
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._handleSend();
      }
    });

    // Auto-resize textarea
    inputEl.addEventListener('input', () => {
      inputEl.style.height = 'auto';
      inputEl.style.height = `${Math.min(inputEl.scrollHeight, 120)}px`;
    });

    // Suggestion chips
    this._root.querySelector('#chat-suggestions').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (chip) {
        inputEl.value = chip.dataset.suggestion;
        inputEl.dispatchEvent(new Event('input'));
        this._handleSend();
      }
    });
  }

  /** @private */
  async _handleSend() {
    if (this._isLoading) return;

    const inputEl = this._root.querySelector('.chat-input');
    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = '';
    inputEl.style.height = 'auto';

    // Add user message
    const userMsg = new ChatMessage({ role: 'user', content: text });
    this._messages.push(userMsg);
    this._appendMessageEl(userMsg);
    this._scrollToBottom();

    // Loading state
    this._isLoading = true;
    this._setInputDisabled(true);
    const typingEl = this._appendTypingIndicator();

    // Create placeholder for assistant response
    const assistantMsg = new ChatMessage({ role: 'assistant', content: '' });
    this._messages.push(assistantMsg);

    try {
      let responseBubble = null;

      const fullText = await this.askAIUseCase.execute(
        this._messages.filter(m => m.role !== 'assistant' || m.content), // don't send empty placeholder
        this._reportContext,
        (chunk) => {
          // Streaming: update the assistant message in real-time
          typingEl.remove();
          assistantMsg.content += chunk;

          if (!responseBubble) {
            responseBubble = this._appendMessageEl(assistantMsg, true);
          } else {
            const bubble = responseBubble.querySelector('.chat-bubble');
            if (bubble) bubble.innerHTML = this._renderBubbleContent(assistantMsg.content);
          }
          this._scrollToBottom();
        }
      );

      // Final state
      assistantMsg.content = fullText;
      if (responseBubble) {
        const bubble = responseBubble.querySelector('.chat-bubble');
        if (bubble) bubble.innerHTML = this._renderBubbleContent(fullText);
      } else {
        typingEl.remove();
        this._appendMessageEl(assistantMsg);
      }

    } catch (err) {
      typingEl.remove();
      assistantMsg.content = `❌ Erro: ${err.message || 'Falha ao comunicar com a IA.'}`;
      this._appendMessageEl(assistantMsg);
    } finally {
      this._isLoading = false;
      this._setInputDisabled(false);
      this._scrollToBottom();
      inputEl.focus();
    }
  }

  /** @private */
  _appendMessageEl(msg, isStreaming = false) {
    const messagesEl = this._root.querySelector('#chat-messages');
    const div = document.createElement('div');
    div.className = `chat-message ${msg.role}`;
    div.innerHTML = `
      <div class="chat-bubble">${this._renderBubbleContent(msg.content)}</div>
      <span class="chat-message-time">${this._formatTime(new Date(msg.timestamp))}</span>
    `;
    messagesEl.appendChild(div);
    return div;
  }

  /** @private */
  _appendTypingIndicator() {
    const messagesEl = this._root.querySelector('#chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-message assistant';
    div.innerHTML = `
      <div class="chat-bubble">
        <div class="chat-typing-indicator">
          <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
          <span>Gerando resposta...</span>
        </div>
      </div>`;
    messagesEl.appendChild(div);
    this._scrollToBottom();
    return div;
  }

  /** @private */
  _renderBubbleContent(text) {
    if (!text) return '';
    // Use marked if available for rich formatting in assistant messages
    try {
      if (window.marked) {
        const html = (window.marked.parse || window.marked)(text);
        return `<div class="bubble-md">${html}</div>`;
      }
    } catch { /* ignore */ }
    // Fallback: plain text with line breaks
    return this._esc(text).replace(/\n/g, '<br>');
  }

  /** @private */
  _clearConversation() {
    this._messages = [];
    const messagesEl = this._root.querySelector('#chat-messages');
    if (messagesEl) {
      messagesEl.innerHTML = `
        <div class="chat-message assistant">
          <div class="chat-bubble">
            🔄 Conversa reiniciada. Como posso ajudar com o relatório?
          </div>
          <span class="chat-message-time">${this._formatTime(new Date())}</span>
        </div>`;
    }
  }

  /** @private */
  _setInputDisabled(disabled) {
    const inputEl = this._root.querySelector('.chat-input');
    const sendBtn = this._root.querySelector('#chat-send');
    if (inputEl) inputEl.disabled = disabled;
    if (sendBtn) sendBtn.disabled = disabled;
  }

  /** @private */
  _scrollToBottom() {
    const messagesEl = this._root.querySelector('#chat-messages');
    if (messagesEl) {
      requestAnimationFrame(() => {
        messagesEl.scrollTop = messagesEl.scrollHeight;
      });
    }
  }

  /** @private */
  _formatTime(date) {
    try {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  /** @private */
  _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
