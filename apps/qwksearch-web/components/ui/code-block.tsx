'use client';

import { cn } from '../../lib/utils';
import React, { useEffect, useState } from 'react';
import hljs from 'highlight.js';
import { useTheme } from 'next-themes';

export type CodeBlockProps = {
  children?: React.ReactNode;
  className?: string;
} & React.HTMLProps<HTMLDivElement>;

function CodeBlock({ children, className, ...props }: CodeBlockProps) {
  return (
    <div className={cn('w-px flex-grow min-w-0 overflow-hidden flex', className)} {...props}>
      {children}
    </div>
  );
}

export type CodeBlockCodeProps = {
  code: string;
  language?: string;
  theme?: string;
  className?: string;
} & React.HTMLProps<HTMLDivElement>;

function CodeBlockCode({
  code,
  language = 'tsx',
  // theme prop is kept for compatibility but highlight.js uses external CSS
  theme: propTheme,
  className,
  ...props
}: CodeBlockCodeProps) {
  const { resolvedTheme } = useTheme();
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);

  useEffect(() => {
    function highlight() {
      if (!code || typeof code !== 'string') {
        setHighlightedHtml(null);
        return;
      }

      try {
        const lang = (language && hljs.getLanguage(language)) ? language : 'plaintext';
        const highlighted = hljs.highlight(code, { language: lang }).value;
        setHighlightedHtml(`<pre class="hljs"><code class="language-${lang}">${highlighted}</code></pre>`);
      } catch (e) {
        setHighlightedHtml(`<pre><code>${code}</code></pre>`);
      }
    }
    highlight();
  }, [code, language, resolvedTheme]);

  const classNames = cn('[&_pre]:!bg-background/95 [&_pre]:rounded-2xl [&_pre]:p-4 [&_pre]:!overflow-x-auto [&_pre]:!w-px [&_pre]:!flex-grow [&_pre]:!min-w-0 [&_pre]:!box-border [&_.shiki]:!overflow-x-auto [&_.shiki]:!w-px [&_.shiki]:!flex-grow [&_.shiki]:!min-w-0 [&_code]:!min-w-0 [&_code]:!whitespace-pre', 'w-px flex-grow min-w-0 overflow-hidden flex w-full', className);

  return highlightedHtml ? (
    <div
      className={classNames}
      dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      {...props}
    />
  ) : (
    <div className={classNames} {...props}>
      <pre className="!overflow-x-auto !w-px !flex-grow !min-w-0 !box-border">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export type CodeBlockGroupProps = React.HTMLAttributes<HTMLDivElement>;

function CodeBlockGroup({
  children,
  className,
  ...props
}: CodeBlockGroupProps) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}

export { CodeBlockGroup, CodeBlockCode, CodeBlock };
