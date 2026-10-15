import React, { useEffect, useRef } from 'react';
import { renderMarkdown, processMathAndMermaid } from '../utils/markdown';

interface MarkdownViewProps {
  content: string;
  exerciseId?: string | null;
  className?: string;
  style?: React.CSSProperties;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({
  content,
  exerciseId,
  className,
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const html = renderMarkdown(content, exerciseId);

  useEffect(() => {
    if (containerRef.current) {
      processMathAndMermaid(containerRef.current);
    }
  }, [html]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
