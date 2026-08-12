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
    <div className="mx-auto flex h-[calc(100vh-57px)] max-w-3xl flex-col px-8 py-7">
      <header className="shrink-0 border-b border-rule pb-5">
        <div className="eyebrow font-sans text-[11px] font-bold tracking-[0.2em] text-ox uppercase">Copilot</div>
        <h1 className="font-serif text-[26px] font-medium tracking-tight text-ink">Ask about your audience</h1>
        <p className="mt-1.5 text-[13.5px] text-ink2">
          Grounded in ClickHouse Cloud + Gemini — try <em>"{EXAMPLE_QUESTION}"</em>
        </p>
      </header>

      <main className="flex-1 space-y-5 overflow-y-auto py-6">
        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
          </ChatBubble>
        ))}

        {loading && (
          <ChatBubble role="assistant">
            <div className="flex items-center gap-2.5 text-ink2">
              <Spinner className="size-4" />
              Querying ClickHouse and analyzing...
            </div>
          </ChatBubble>
        )}

        {error && <div className="text-sm text-destructive">Error: {error}</div>}
        <div ref={bottomRef} />
      </main>

      <form className="flex shrink-0 gap-2.5 border-t border-rule pt-5" onSubmit={handleSubmit}>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about audience behavior, e.g. '${EXAMPLE_QUESTION}'`}
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !input.trim()} size="icon" aria-label="Send" className="rounded-full">
          ↑
        </Button>
      </form>
    </div>
  );
}

function ChatBubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex flex-col", isUser && "items-end")}>
      <div className="mb-1.5 font-sans text-[9px] font-bold tracking-[0.16em] uppercase" style={{ color: isUser ? "var(--ink3)" : "var(--ox)" }}>
        {isUser ? "You" : "Copilot"}
      </div>
      <div
        className={cn(
          "prose prose-sm max-w-[92%] text-[13.5px] leading-relaxed",
          "prose-headings:font-serif prose-headings:mt-0 prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0",
          "prose-table:my-3 prose-th:text-left prose-strong:text-ink",
          "prose-code:rounded-[3px] prose-code:bg-paper3 prose-code:text-ink prose-code:before:content-none prose-code:after:content-none",
          "prose-pre:border prose-pre:border-rule2 prose-pre:bg-paper3 prose-pre:text-ink",
          isUser
            ? "border-r-2 border-ink pr-3.5 text-right text-ink2 italic"
            : "border-l-2 border-ox pl-3.5 text-ink"
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default Copilot;
