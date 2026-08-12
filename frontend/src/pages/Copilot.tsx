import { useState, useRef, useEffect, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

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
    <div className="flex h-screen max-w-3xl flex-col px-10 py-8">
      <header className="shrink-0">
        <h1 className="text-2xl font-semibold">🎬 Copilot</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Ask anything about audience behavior — grounded in ClickHouse Cloud + Gemini
        </p>
      </header>

      <main className="flex-1 space-y-4 overflow-y-auto py-5">
        {messages.length === 0 && (
          <div className="text-sm text-muted-foreground">
            Try: <em>"{EXAMPLE_QUESTION}"</em>
          </div>
        )}
        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
          </ChatBubble>
        ))}

        {loading && (
          <ChatBubble role="assistant">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Spinner className="size-4" />
              Querying ClickHouse and analyzing...
            </div>
          </ChatBubble>
        )}

        {error && <div className="text-sm text-destructive">Error: {error}</div>}
        <div ref={bottomRef} />
      </main>

      <form className="flex shrink-0 gap-2.5 pb-2" onSubmit={handleSubmit}>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about audience behavior, e.g. '${EXAMPLE_QUESTION}'`}
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !input.trim()} size="icon" aria-label="Send">
          ↑
        </Button>
      </form>
    </div>
  );
}

function ChatBubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-[1.1rem]">
        {role === "user" ? "🎥" : "🤖"}
      </span>
      <div
        className={cn(
          "prose prose-sm dark:prose-invert max-w-none overflow-x-auto rounded-xl border border-border bg-card px-4.5 py-3.5 leading-relaxed",
          "prose-headings:mt-0 prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0",
          "prose-table:my-3 prose-th:text-left"
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default Copilot;
