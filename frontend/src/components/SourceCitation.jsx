import { useState } from "react";

export default function SourceCitation({ source }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--muted)]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-[var(--card)]"
      >
        <div className="min-w-0 flex items-center gap-2">
          <span className="shrink-0 text-[var(--muted-foreground)]">📄</span>
          <span className="truncate text-sm font-medium text-[var(--foreground)]">
            {source.document_name}
          </span>
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-2">
          <span className="text-xs text-[var(--muted-foreground)]">
            {(source.similarity_score * 100).toFixed(0)}% match
          </span>
          <span className="text-xs text-[var(--muted-foreground)]">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-[var(--border)] bg-[var(--card)] px-3 pb-3 pt-1 text-sm text-[var(--foreground)]">
          {source.chunk_excerpt}
        </div>
      )}
    </div>
  );
}
