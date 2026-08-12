import { useRef, useState } from "react";
import client from "../api/client";
import RoleBadge from "../components/RoleBadge";
import SourceCitation from "../components/SourceCitation";

const QUICK_PROMPTS = [
  "Summarize last quarter's sales report",
  "Find the policy on remote work",
  "Analyze competitor marketing data",
];

export default function Chat({ user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  async function handleSend(e) {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setLoading(true);

    try {
      const res = await client.post("/chat/ask", { question });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.data.answer, sources: res.data.sources },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: err.response?.data?.detail || "Something went wrong. Please try again.",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)] px-8 py-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Ask your documents</h1>
          <p className="text-xs text-[var(--muted-foreground)]">
            Answers are restricted to documents your role can access
          </p>
        </div>
        <RoleBadge role={user.role} />
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-8 py-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="mb-6 w-full max-w-[520px] rounded-[20px] border border-[var(--border)] bg-[var(--card)] px-8 py-6 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--foreground)] shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                  <path d="M7 9.5a5 5 0 0 1 10 0v5a5 5 0 0 1-10 0v-5Z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 18h6" strokeLinecap="round" />
                  <path d="M12 13.5v3.5" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                Ask a question about company documents. You're logged in as{" "}
                <span className="font-medium text-[var(--foreground)]">{user.role}</span>, so
                you'll only see answers sourced from documents your role can access.
              </p>
            </div>

            <div className="flex w-full max-w-[520px] justify-center gap-3">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-center text-sm text-[var(--foreground)] shadow-sm transition-colors hover:border-[var(--primary)] hover:bg-[var(--muted)]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-2xl ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-2`}>
              <div
                className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "rounded-br-sm bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : msg.error
                    ? "rounded-bl-sm border border-[var(--border)] bg-[rgba(202,50,20,0.08)] text-[var(--destructive)]"
                    : "rounded-bl-sm border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                }`}
              >
                {msg.text}
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="w-full space-y-1.5">
                  <p className="px-1 text-xs font-medium text-[var(--muted-foreground)]">Sources</p>
                  {msg.sources.map((src, j) => (
                    <SourceCitation key={j} source={src} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-[var(--border)] bg-[var(--background)] px-8 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="h-12 flex-1 rounded-[18px] border border-[var(--border)] bg-[var(--input)] px-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center gap-2 rounded-[18px] bg-[var(--primary)] px-5 py-3 text-sm font-medium text-[var(--primary-foreground)] shadow-sm transition-colors hover:brightness-105 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
              <path d="M5 12h12" strokeLinecap="round" />
              <path d="m13 7 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
