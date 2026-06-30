import { useRef, useState } from "react";
import client from "../api/client";
import RoleBadge from "../components/RoleBadge";
import SourceCitation from "../components/SourceCitation";

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
    <div className="flex-1 flex flex-col h-screen">
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Ask your documents</h1>
          <p className="text-xs text-slate-400">
            Answers are restricted to documents your role can access
          </p>
        </div>
        <RoleBadge role={user.role} />
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-sm">
              <p className="text-3xl mb-3">💬</p>
              <p className="text-slate-500 text-sm">
                Ask a question about company documents. You're logged in as{" "}
                <span className="font-medium text-slate-700">{user.role}</span>, so
                you'll only see answers sourced from documents your role can access.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-2xl ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-2`}>
              <div
                className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-brand-600 text-white rounded-br-sm"
                    : msg.error
                    ? "bg-rose-50 text-rose-700 rounded-bl-sm border border-rose-200"
                    : "bg-white text-slate-800 rounded-bl-sm border border-slate-200"
                }`}
              >
                {msg.text}
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="w-full space-y-1.5">
                  <p className="text-xs font-medium text-slate-400 px-1">Sources</p>
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
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white border border-slate-200 text-sm text-slate-400">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-slate-200 bg-white px-8 py-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
