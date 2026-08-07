'use client';

import { useState, useRef, useEffect } from 'react';
import type { Message, AIModel } from '@/types';
import MarkdownRenderer from './MarkdownRenderer';
import { TOPIC_DOCUMENTS_CHANGED_EVENT } from '@/lib/topic-context';

export default function ChatInterface({ topicId, model }: { topicId: string; model: AIModel }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [contextUpdated, setContextUpdated] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  // Aborts the in-flight stream; the counter marks its results stale so a
  // response that arrives after a reset or unmount can't resurrect old state.
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  // Load session
  useEffect(() => {
    fetch(`/api/sessions?topicId=${topicId}&mode=chat`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.session?.messages) && d.session.messages.length > 0)
          setMessages(d.session.messages);
      })
      .catch(() => {})
      .finally(() => setSessionLoading(false));
  }, [topicId]);

  // Restore draft
  useEffect(() => {
    try { const d = sessionStorage.getItem(`chat-draft-${topicId}`); if (d) setInput(d); } catch {}
  }, [topicId]);

  useEffect(() => {
    const handleTopicDocumentsChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ topicId?: string }>).detail;
      if (detail?.topicId !== topicId) return;

      // Stop any running stream first — otherwise its loop keeps appending to
      // the conversation we are clearing, and then persists it, recreating the
      // session row the upload just deleted.
      requestIdRef.current++;
      abortRef.current?.abort();
      abortRef.current = null;

      setMessages([]);
      setInput('');
      setStreaming(false);
      setContextUpdated(true);
      try { sessionStorage.removeItem(`chat-draft-${topicId}`); } catch {}
    };

    window.addEventListener(TOPIC_DOCUMENTS_CHANGED_EVENT, handleTopicDocumentsChanged);
    return () => {
      window.removeEventListener(TOPIC_DOCUMENTS_CHANGED_EVENT, handleTopicDocumentsChanged);
    };
  }, [topicId]);

  // Cancel the stream when the component goes away (e.g. switching to CARDS).
  // These refs hold a counter and an AbortController, not a DOM node, so
  // reading the current value at cleanup time is exactly what we want.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    return () => {
      requestIdRef.current++;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Persist draft
  useEffect(() => {
    try {
      if (input) sessionStorage.setItem(`chat-draft-${topicId}`, input);
      else sessionStorage.removeItem(`chat-draft-${topicId}`);
    } catch {}
  }, [input, topicId]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || streaming) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setContextUpdated(false);
    setMessages(newMessages);
    setInput('');
    setStreaming(true);
    setMessages([...newMessages, { role: 'assistant', content: '' }]);

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    const isStale = () => requestIdRef.current !== requestId;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, messages: newMessages, model }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get response');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No response body');

      let fullContent = '';
      // SSE frames do not align with read boundaries: a chunk can end mid-frame.
      // Hold the trailing partial line over to the next read instead of parsing
      // (and silently dropping) it.
      let buffer = '';
      let finished = false;

      while (!finished) {
        const { done, value } = await reader.read();
        if (done) break;
        if (isStale()) { await reader.cancel(); return; }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') { finished = true; break; }

          const parsed = JSON.parse(data);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.text) {
            fullContent += parsed.text;
            setMessages([...newMessages, { role: 'assistant', content: fullContent }]);
          }
        }
      }

      if (isStale()) return;

      const finalMessages: Message[] = [...newMessages, { role: 'assistant', content: fullContent }];
      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, mode: 'chat', data: finalMessages }),
      }).catch(() => {});
    } catch (err) {
      if (isStale() || (err instanceof DOMException && err.name === 'AbortError')) return;
      setMessages([...newMessages, {
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Something went wrong'}`,
      }]);
    } finally {
      if (!isStale()) setStreaming(false);
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  if (sessionLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="pixel-spinner" style={{ width: 28, height: 28, borderWidth: 4 }} />
        <p className="font-pixelify font-semibold text-[15px] text-ink/60 pixel-cursor">Loading</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
        {messages.length === 0 && (
          <div className="pixel-box p-0 max-w-md mx-auto mt-12 overflow-hidden">
            <div className="pixel-titlebar text-center">READY TO STUDY</div>
            <div className="p-6 text-center">
              <p className="font-vt323 text-xl text-ink/55 leading-relaxed">
                Ask anything about your topic.<br />
                Try &ldquo;Summarize the key concepts&rdquo; or<br />
                &ldquo;What are the main topics?&rdquo;
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="font-pixelify font-bold text-[14px] text-[var(--px-blue)] mr-2 mt-2 shrink-0 self-start">AI</div>
            )}
            <div
              className={`max-w-[80%] border-[3px] border-ink px-4 py-2 font-inter text-[15px] leading-relaxed ${
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
              <div className="font-pixelify font-bold text-[14px] text-ink/60 ml-2 mt-2 shrink-0 self-start">You</div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="pt-4 border-t-[3px] border-ink">
        {contextUpdated && (
          <p className="font-pixelify font-semibold text-[13px] text-[var(--px-green)] mb-3">
            Files changed. Chat history was cleared so the next answer uses the latest uploads.
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your topic..."
            disabled={streaming}
            className="pixel-input flex-1"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="pixel-btn pixel-btn-primary shrink-0"
          >
            {streaming ? '...' : 'SEND ▶'}
          </button>
        </form>
      </div>
    </div>
  );
}
