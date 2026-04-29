import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, MessageCircle, Send, Sparkles, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { streamAssistant } from "@/services/aiService";
import type { ChatMessage, Student } from "@/lib/types";

interface AssistantProps {
  students: Student[];
}

const QUICK_PROMPTS = [
  "Analisis nilai siswa",
  "Siapa yang perlu bimbingan?",
  "Beri ringkasan kelas",
];

/**
 * Floating AI Assistant chat. Sends current students[] to backend so the
 * model can reason over actual data. Uses streaming for smooth typing.
 */
export function AIAssistant({ students }: AssistantProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new content
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  /** Send a message and stream the response */
  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setIsLoading(true);

    let acc = "";
    const upsertAssistant = (delta: string) => {
      acc += delta;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: acc } : m,
          );
        }
        return [...prev, { role: "assistant", content: acc }];
      });
    };

    try {
      await streamAssistant({
        messages: next,
        students,
        onDelta: upsertAssistant,
        onDone: () => setIsLoading(false),
        onError: (status, msg) => {
          setIsLoading(false);
          toast.error(msg);
        },
      });
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      toast.error("Gagal menghubungi AI Assistant");
    }
  };

  return (
    <>
      {/* Floating trigger */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary shadow-elegant transition-smooth animate-float-slow"
        aria-label="AI Assistant"
      >
        {open ? (
          <X className="h-6 w-6 text-primary-foreground" />
        ) : (
          <MessageCircle className="h-6 w-6 text-primary-foreground" />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-24 right-6 z-40 flex h-[560px] max-h-[80vh] w-[min(420px,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl border border-border bg-popover shadow-elegant"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border bg-gradient-card px-4 py-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold">AI Assistant</p>
                <p className="text-xs text-muted-foreground">
                  Konteks: {students.length} siswa
                </p>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  <Sparkles className="mb-2 h-4 w-4 text-primary" />
                  Tanyakan apa saja tentang nilai kelas, atau gunakan prompt
                  cepat di bawah.
                </div>
              )}
              {messages.map((m, i) => (
                <Bubble key={i} role={m.role} content={m.content} />
              ))}
              {isLoading &&
                messages[messages.length - 1]?.role === "user" && (
                  <Bubble role="assistant" content="" loading />
                )}
            </div>

            {/* Quick prompts */}
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 border-t border-border bg-card/50 px-4 py-3">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs transition-smooth hover:border-primary hover:text-primary"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t border-border bg-card/40 p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tulis pertanyaan…"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <Button
                type="submit"
                size="icon"
                variant="hero"
                disabled={isLoading || !input.trim()}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Bubble({
  role,
  content,
  loading,
}: {
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-gradient-primary text-primary-foreground"
            : "bg-secondary text-foreground"
        }`}
      >
        {loading ? (
          <span className="inline-flex gap-1">
            <Dot delay={0} />
            <Dot delay={0.15} />
            <Dot delay={0.3} />
          </span>
        ) : (
          <span className="whitespace-pre-wrap">{content}</span>
        )}
      </div>
    </motion.div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <motion.span
      animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 0.9, repeat: Infinity, delay }}
      className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground"
    />
  );
}
