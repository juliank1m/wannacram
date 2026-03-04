'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { Components } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const components: Components = {
  h1: ({ children }) => <h1 className="text-xl font-bold mt-3 mb-2 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-semibold mt-3 mb-1 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-semibold mt-2 mb-1 first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5 text-left">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5 text-left">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-current opacity-70 pl-3 my-2">{children}</blockquote>
  ),
  hr: () => <hr className="border-current opacity-20 my-3" />,
  // Let SyntaxHighlighter render its own <pre>, so suppress the default wrapper
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children }) => {
    const match = /language-(\w+)/.exec(className ?? '');
    const language = match ? match[1] : null;
    const codeString = String(children).replace(/\n$/, '');

    // Block code: has a language tag, or contains newlines (multi-line block)
    const isBlock = Boolean(language) || codeString.includes('\n');

    if (isBlock) {
      return (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language ?? 'text'}
          PreTag="div"
          className="rounded-lg text-[0.85em] mb-2 text-left"
          customStyle={{ borderRadius: '0.5rem', marginBottom: '0.5rem' }}
        >
          {codeString}
        </SyntaxHighlighter>
      );
    }

    // Inline code
    return (
      <code className="bg-black/10 dark:bg-white/10 rounded px-1 py-0.5 font-mono text-[0.85em]">
        {children}
      </code>
    );
  },
};

export default function MarkdownRenderer({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
