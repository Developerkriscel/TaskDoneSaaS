import { useCallback, useEffect, useRef, useState } from 'react';
import { platformApi } from '../services/api.js';

const SYSTEM_PROMPT = `You are TaskDone AI, a smart assistant for the TaskDone SaaS platform.

YOUR DATA SOURCE:
- All the data you need is in USER_CONTEXT (provided automatically by the server).
- Use this data fully — analyze, compare, rank, and provide insights.
- If specific data is genuinely not present → say: "I don't have that specific data."

WHAT YOU CAN DO:
- Compare employee performance (who has most pending, most delays, best on-time rate).
- Summarize tasks (delegation, checklist, work requests) with details.
- Identify bottlenecks (most delayed tasks, overloaded employees).
- Give actionable recommendations based on data patterns.
- Answer questions about team, company, plans, and tasks.

SECURITY RULES:
- NEVER expose passwords, tokens, hashes, or internal system IDs.
- NEVER mention database, backend, APIs, or system internals.

RESPONSE STYLE:
- Be concise but thorough. Use bullet points and structured format.
- When comparing employees, show numbers.
- You may respond in Hinglish if the user writes in Hindi.
- Provide analysis and insights proactively when relevant.`;

function ChatBubbleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" opacity="0.9">
      <polygon points="12,2 14.5,9.5 22,12 14.5,14.5 12,22 9.5,14.5 2,12 9.5,9.5" />
    </svg>
  );
}

export default function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [configError, setConfigError] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  function toggleOpen() {
    setOpen((prev) => !prev);
    setConfigError('');
  }

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    const userMsg = { role: 'user', content: trimmed };

    // Only send system prompt + last 6 messages (backend injects context)
    const fewMessages = messages.slice(-6);
    const apiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...fewMessages,
      userMsg
    ];

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setStreaming(true);
    setConfigError('');

    const assistantMsg = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await platformApi.aiChatStream(apiMessages);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error || 'AI request failed';
        if (res.status === 503) setConfigError(errMsg);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: `⚠️ ${errMsg}` };
          return updated;
        });
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith('data: ')) continue;
          const payload = trimmedLine.slice(6);
          if (payload === '[DONE]') break;
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = { ...last, content: last.content + delta };
                return updated;
              });
            }
          } catch { /* skip malformed chunks */ }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: `⚠️ ${err.message || 'Connection failed'}` };
          return updated;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setStreaming(false);
    setConfigError('');
  }

  return (
    <>
      {/* Floating Chat Button */}
      <button
        type="button"
        className={`ai-chat-fab ${open ? 'ai-chat-fab--open' : ''}`}
        onClick={toggleOpen}
        aria-label={open ? 'Close AI Chat' : 'Open AI Chat'}
      >
        {open ? <CloseIcon /> : <ChatBubbleIcon />}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <div className="ai-chat-header-left">
              <span className="ai-chat-sparkle"><SparkleIcon /></span>
              <div>
                <strong>TaskDone AI</strong>
                <span className="ai-chat-status">
                  {streaming ? '● Thinking...' : '● Online'}
                </span>
              </div>
            </div>
            <div className="ai-chat-header-actions">
              <button type="button" className="ai-chat-clear-btn" onClick={clearChat} title="Clear chat">
                ✕
              </button>
            </div>
          </div>

          <div className="ai-chat-messages">
            {messages.length === 0 && !configError && (
              <div className="ai-chat-empty">
                <div className="ai-chat-empty-icon">✨</div>
                <p><strong>Hi! I&apos;m TaskDone AI</strong></p>
                <p>Ask me about your team, tasks, company data, or anything on your dashboard.</p>
                <div className="ai-chat-suggestions">
                  {['Show my team summary', 'How many tasks are pending?', 'Give me a quick overview'].map((q) => (
                    <button key={q} type="button" className="ai-chat-suggestion-btn" onClick={() => { setInput(q); }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {configError && messages.length === 0 && (
              <div className="ai-chat-empty">
                <div className="ai-chat-empty-icon">⚙️</div>
                <p><strong>AI Not Configured</strong></p>
                <p style={{ color: '#ef4444', fontSize: '0.8rem' }}>{configError}</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`ai-chat-msg ai-chat-msg--${msg.role}`}>
                {msg.role === 'assistant' && <span className="ai-chat-msg-avatar">✦</span>}
                <div className="ai-chat-msg-content">
                  {msg.content || (msg.role === 'assistant' && streaming ? <span className="ai-chat-typing">●●●</span> : '')}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-chat-input-area">
            <textarea
              ref={inputRef}
              className="ai-chat-input"
              placeholder="Ask about your data..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={streaming}
            />
            <button
              type="button"
              className="ai-chat-send-btn"
              onClick={sendMessage}
              disabled={streaming || !input.trim()}
              aria-label="Send"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
