'use client';

import { useState, useRef, useEffect } from 'react';
import type { Message, AIModel } from '@/types';
import MarkdownRenderer from './MarkdownRenderer';

export default function ChatInterface({ documentId, model }: { documentId: string; model: AIModel }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load session
  useEffect(() => {
    fetch(`/api/sessions?documentId=${documentId}&mode=chat`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.session?.messages) && d.session.messages.length > 0)
          setMessages(d.session.messages);
      })
      .catch(() => {})
      .finally(() => setSessionLoading(false));
  }, [documentId]);

  // Restore draft
  useEffect(() => {
    try { const d = sessionStorage.getItem(`chat-draft-${documentId}`); if (d) setInput(d); } catch {}
  }, [documentId]);

  // Persist draft
  useEffect(() => {
    try {
      if (input) sessionStorage.setItem(`chat-draft-${documentId}`, input);
      else sessionStorage.removeItem(`chat-draft-${documentId}`);
    } catch {}
  }, [input, documentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || streaming) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setStreaming(true);
    setMessages([...newMessages, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, messages: newMessages, model }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get response');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No response body');

      let fullContent = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              fullContent += parsed.text;
              setMessages([...newMessages, { role: 'assistant', content: fullContent }]);
            }
            if (parsed.error) throw new Error(parsed.error);
          } catch (e) { if (e instanceof SyntaxError) continue; throw e; }
        }
      }

      const finalMessages: Message[] = [...newMessages, { role: 'assistant', content: fullContent }];
      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, mode: 'chat', data: finalMessages }),
      }).catch(() => {});
    } catch (err) {
      setMessages([...newMessages, {
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Something went wrong'}`,
      }]);
    } finally {
      setStreaming(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-18rem)] gap-4">
        <div className="pixel-spinner" style={{ width: 28, height: 28, borderWidth: 4 }} />
        <p className="font-pixel text-[8px] text-ink/40 pixel-cursor">LOADING</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-18rem)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
        {messages.length === 0 && (
          <div className="pixel-box p-0 max-w-md mx-auto mt-12 overflow-hidden">
            <div className="pixel-titlebar text-[9px] text-center">READY TO STUDY</div>
            <div className="p-6 text-center">
              <p className="font-vt323 text-xl text-ink/55 leading-relaxed">
                Ask anything about your document.<br />
                Try &ldquo;Summarize the key concepts&rdquo; or<br />
                &ldquo;What are the main topics?&rdquo;
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="font-pixel text-[8px] text-[var(--px-blue)] mr-2 mt-2 shrink-0 self-start">AI</div>
            )}
            <div
              className={`max-w-[80%] border-[3px] border-ink px-4 py-2 font-vt323 text-[19px] leading-snug ${
                msg.role === 'user'
                  ? 'bg-[var(--px-blue)] text-white'
                  : 'bg-surface text-ink'
              }`}
              style={{ boxShadow: '3px 3px 0 var(--ink)' }}
            >
              {msg.role === 'user' ? (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              ) : (
                <MarkdownRenderer content={msg.content} />
              )}
              {streaming && i === messages.length - 1 && msg.role === 'assistant' && (
                <span className="inline-block w-2 h-4 bg-current ml-0.5 animate-pulse" />
              )}
            </div>
            {msg.role === 'user' && (
              <div className="font-pixel text-[8px] text-ink/40 ml-2 mt-2 shrink-0 self-start">YOU</div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="pt-4 border-t-[3px] border-ink">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your document..."
            disabled={streaming}
            className="pixel-input flex-1"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="pixel-btn pixel-btn-primary text-[9px] shrink-0"
          >
            {streaming ? '...' : 'SEND ▶'}
          </button>
        </form>
      </div>
    </div>
  );
}
