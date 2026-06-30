import { useState } from "react";

export default function SourceCitation({ source }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-slate-400 shrink-0">📄</span>
          <span className="text-sm font-medium text-slate-700 truncate">
            {source.document_name}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-xs text-slate-400">
            {(source.similarity_score * 100).toFixed(0)}% match
          </span>
          <span className="text-slate-400 text-xs">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-1 text-sm text-slate-600 border-t border-slate-200 bg-white">
          {source.chunk_excerpt}
        </div>
      )}
    </div>
  );
}
