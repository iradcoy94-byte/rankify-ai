import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, MessageCircle, Send, Sparkles, X, Loader2, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { streamAssistant } from "@/services/aiService";
import { getToken } from "@/services/api";
import type { ChatMessage, Student } from "@/lib/types";

interface AssistantProps {
  students: Student[];
}

const QUICK_PROMPTS = [
  "Jelaskan konsep ini langkah demi langkah",
  "Bantu saya memahami soal matematika",
  "Buat contoh soal serupa dan pembahasannya",
  "Cek cara pengerjaan saya",
];

export function AIAssistant({ students }: AssistantProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
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
            className="fixed bottom-24 right-6 z-40 h-[560px] max-h-[80vh] w-[min(420px,calc(100vw-3rem))] overflow-hidden rounded-2xl border border-border bg-popover shadow-elegant"
          >
            <AssistantChatSurface students={students} compact />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function AssistantChatSurface({
  students,
  compact = false,
  fullPage = false,
}: AssistantProps & { compact?: boolean; fullPage?: boolean }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    if (!getToken()) {
      toast.error("AI Assistant membutuhkan backend/API aktif agar semua siswa memakai sumber jawaban yang sama.");
      return;
    }

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
        onError: (_status, msg) => {
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

  const isEmptyFullPage = fullPage && messages.length === 0;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      {!fullPage && (
        <div className="flex items-center gap-3 border-b border-border bg-gradient-card px-4 py-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="font-semibold">{compact ? "AI Assistant" : "AI Assistant Matematika"}</p>
            <p className="truncate text-xs text-muted-foreground">
              Satu API dan satu konteks untuk pembahasan yang konsisten
            </p>
          </div>
        </div>
      )}

      {isEmptyFullPage ? (
        <div className="flex flex-1 items-center justify-center px-4 pb-20">
          <div className="w-full max-w-3xl">
            <EmptyAssistantState compact={compact} fullPage={fullPage} onPrompt={send} />
            <ChatComposer
              compact={compact}
              fullPage={fullPage}
              input={input}
              isLoading={isLoading}
              onInputChange={setInput}
              onSend={send}
            />
          </div>
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            className={`flex-1 space-y-4 overflow-y-auto ${
              fullPage ? "px-4 py-8 md:px-8" : "p-4 md:p-6"
            }`}
          >
            {messages.length === 0 && (
              <EmptyAssistantState compact={compact} fullPage={fullPage} onPrompt={send} />
            )}
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content} compact={compact} />
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <Bubble role="assistant" content="" loading compact={compact} />
            )}
          </div>

          <div
            className={`${fullPage ? "bg-background px-4 pb-6 md:px-8 md:pb-8" : "border-t border-border bg-card/40 p-3 md:p-4"}`}
          >
            <ChatComposer
              compact={compact}
              fullPage={fullPage}
              input={input}
              isLoading={isLoading}
              onInputChange={setInput}
              onSend={send}
            />
          </div>
        </>
      )}
    </section>
  );
}

function ChatComposer({
  compact,
  fullPage,
  input,
  isLoading,
  onInputChange,
  onSend,
}: {
  compact: boolean;
  fullPage: boolean;
  input: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSend: (text: string) => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSend(input);
      }}
      className="mx-auto flex max-w-4xl items-end gap-2"
    >
      <textarea
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend(input);
          }
        }}
        placeholder="Tulis soal matematika atau bagian yang belum dipahami..."
        rows={compact ? 1 : 2}
        className={`${fullPage ? "rounded-3xl bg-card/80 px-5 py-3 shadow-card-soft" : "rounded-xl bg-background px-3 py-2.5"} max-h-36 min-h-11 flex-1 resize-none border border-border text-sm outline-none transition-smooth focus:border-primary`}
      />
      <Button
        type="submit"
        size="icon"
        variant="hero"
        className={fullPage ? "h-11 w-11 rounded-full" : ""}
        disabled={isLoading || !input.trim()}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
}

function EmptyAssistantState({
  compact,
  fullPage,
  onPrompt,
}: {
  compact: boolean;
  fullPage: boolean;
  onPrompt: (prompt: string) => void;
}) {
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col justify-center py-8 text-center">
      {!fullPage && (
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary shadow-elegant">
          <Calculator className="h-7 w-7 text-primary-foreground" />
        </div>
      )}
      <h2 className={`${compact ? "text-lg" : "text-2xl md:text-3xl"} font-bold`}>
        Apa yang ingin kalian pelajari hari ini?
      </h2>
      {!compact && !fullPage && (
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Semua peserta didik bertanya melalui AI yang sama dan API yang sama,
          sehingga pembahasan untuk soal yang sama tetap konsisten.
        </p>
      )}
      {!fullPage && (
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onPrompt(prompt)}
              className="rounded-xl border border-border bg-card/70 px-4 py-3 text-left text-sm transition-smooth hover:border-primary hover:text-primary"
            >
              <Sparkles className="mb-2 h-4 w-4 text-primary" />
              {prompt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Bubble({
  role,
  content,
  loading,
  compact,
}: {
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
  compact: boolean;
}) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`${compact ? "max-w-[85%]" : "max-w-[min(760px,85%)]"} rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
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
