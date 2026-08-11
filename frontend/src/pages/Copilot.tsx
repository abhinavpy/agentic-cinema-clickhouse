import { useState, useRef, useEffect, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../api";
import "./Copilot.css";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const EXAMPLE_QUESTION = "Where do viewers drop off in episode 3?";

function Copilot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const answer = await api.ask(question);
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="copilot">
      <header className="page-header">
        <h1>🎬 Copilot</h1>
        <p>Ask anything about audience behavior — grounded in ClickHouse Cloud + Gemini</p>
      </header>

      <main className="chat">
        {messages.length === 0 && (
          <div className="empty-state">
            Try: <em>"{EXAMPLE_QUESTION}"</em>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            <span className="avatar">{m.role === "user" ? "🎥" : "🤖"}</span>
            <div className="content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
            </div>
          </div>
        ))}

        {loading && (
          <div className="bubble assistant">
            <span className="avatar">🤖</span>
            <div className="content loading">
              <span className="spinner" />
              Querying ClickHouse and analyzing...
            </div>
          </div>
        )}

        {error && <div className="error">Error: {error}</div>}
        <div ref={bottomRef} />
      </main>

      <form className="composer" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about audience behavior, e.g. '${EXAMPLE_QUESTION}'`}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()} aria-label="Send">
          ↑
        </button>
      </form>
    </div>
  );
}

export default Copilot;
