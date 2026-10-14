import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Camera,
  Calculator,
  Loader2,
  MessageCircle,
  Paperclip,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { streamAssistant } from "@/services/aiService";
import type { ChatMessage, Student } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";

interface AssistantProps {
  students: Student[];
}

const QUICK_PROMPTS = [
  "Jelaskan konsep ini langkah demi langkah",
  "Bantu saya memahami soal matematika",
  "Buat contoh soal serupa dan pembahasannya",
  "Cek cara pengerjaan saya",
];
const TEACHER_PROMPTS = [
  "Ringkas perkembangan nilai per kelas",
  "Identifikasi asesmen dengan rata-rata terendah",
  "Sarankan tindak lanjut dari ringkasan nilai",
  "Jelaskan perubahan pre-test dan post-test",
];

interface ImageAttachment {
  id: string;
  name: string;
  dataUrl: string;
}

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
  void students;
  const { session } = useAuth();
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  const send = async (text: string, images = attachments) => {
    const trimmed = text.trim();
    if ((!trimmed && images.length === 0) || isLoading) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: buildUserContent(trimmed, images),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setAttachments([]);
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
        role: session?.role,
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
            <p className="font-semibold">{session?.role === "siswa" ? "Tutor Matematika" : "Insight AI Guru"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {session?.role === "siswa" ? "Belajar dari materi yang disetujui guru" : "Ringkasan anonim dari kelas yang ditugaskan"}
            </p>
          </div>
        </div>
      )}

      {isEmptyFullPage ? (
        <div className="flex flex-1 items-center justify-center px-4 pb-20">
          <div className="w-full max-w-3xl">
            <EmptyAssistantState compact={compact} fullPage={fullPage} onPrompt={send} role={session?.role ?? "siswa"} />
            <ChatComposer
              compact={compact}
              fullPage={fullPage}
              input={input}
              isLoading={isLoading}
              onInputChange={setInput}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
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
              <EmptyAssistantState compact={compact} fullPage={fullPage} onPrompt={send} role={session?.role ?? "siswa"} />
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
              attachments={attachments}
              onAttachmentsChange={setAttachments}
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
  attachments,
  onAttachmentsChange,
  onSend,
}: {
  compact: boolean;
  fullPage: boolean;
  input: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  attachments: ImageAttachment[];
  onAttachmentsChange: (value: ImageAttachment[]) => void;
  onSend: (text: string, images?: ImageAttachment[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const canSend = input.trim().length > 0 || attachments.length > 0;

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (imageFiles.length === 0) {
      toast.error("Pilih file gambar agar AI bisa membacanya.");
      return;
    }

    try {
      const next = await Promise.all(imageFiles.map(readImageAttachment));
      onAttachmentsChange([...attachments, ...next].slice(0, 4));
    } catch {
      toast.error("Gambar gagal dibaca. Coba pilih gambar lain.");
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSend(input, attachments);
      }}
      className="mx-auto max-w-4xl"
    >
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((image) => (
            <div
              key={image.id}
              className="group relative h-16 w-16 overflow-hidden rounded-xl border border-border bg-card"
            >
              <img src={image.dataUrl} alt={image.name} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() =>
                  onAttachmentsChange(attachments.filter((item) => item.id !== image.id))
                }
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/85 text-foreground opacity-0 transition-smooth group-hover:opacity-100"
                aria-label={`Hapus ${image.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={fullPage ? "h-11 w-11 rounded-full" : ""}
          disabled={isLoading}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Upload gambar"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={fullPage ? "h-11 w-11 rounded-full" : ""}
          disabled={isLoading}
          onClick={() => cameraInputRef.current?.click()}
          aria-label="Ambil gambar"
        >
          <Camera className="h-4 w-4" />
        </Button>
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend(input, attachments);
            }
          }}
          placeholder="Tulis soal matematika, atau lampirkan foto soal..."
          rows={compact ? 1 : 2}
          className={`${fullPage ? "rounded-3xl bg-card/80 px-5 py-3 shadow-card-soft" : "rounded-xl bg-background px-3 py-2.5"} max-h-36 min-h-11 flex-1 resize-none border border-border text-sm outline-none transition-smooth focus:border-primary`}
        />
        <Button
          type="submit"
          size="icon"
          variant="hero"
          className={fullPage ? "h-11 w-11 rounded-full" : ""}
          disabled={isLoading || !canSend}
          aria-label="Kirim"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
}

function EmptyAssistantState({
  compact,
  fullPage,
  onPrompt,
  role,
}: {
  compact: boolean;
  fullPage: boolean;
  onPrompt: (prompt: string) => void;
  role: string;
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
          {(role === "siswa" ? QUICK_PROMPTS : TEACHER_PROMPTS).map((prompt) => (
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

export function MathMessageContent({ text, isUser }: { text: string; isUser: boolean }) {
  if (!text) return null;
  if (isUser) {
    return <span className="block whitespace-pre-wrap">{text}</span>;
  }

  const displayParts = text.split(/(\$\$[\s\S]*?\$\$)/g);

  return (
    <div className="space-y-1.5 leading-relaxed">
      {displayParts.map((part, index) => {
        if (part.startsWith("$$") && part.endsWith("$$") && part.length >= 4) {
          const formula = part.slice(2, -2).trim();
          return (
            <div
              key={index}
              className="my-2 overflow-x-auto rounded-xl border border-primary/20 bg-background/80 p-3 text-center font-mono text-sm tracking-wide text-foreground shadow-sm"
            >
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-sans">Rumus Matematika</div>
              <code className="select-all whitespace-pre-wrap break-words">{formula}</code>
            </div>
          );
        }

        const inlineParts = part.split(/(\$[^\$\n]+?\$)/g);
        return (
          <span key={index} className="whitespace-pre-wrap">
            {inlineParts.map((inlinePart, subIndex) => {
              if (inlinePart.startsWith("$") && inlinePart.endsWith("$") && inlinePart.length >= 3) {
                const inlineFormula = inlinePart.slice(1, -1);
                return (
                  <code
                    key={subIndex}
                    className="mx-0.5 rounded border border-primary/25 bg-primary/10 px-1.5 py-0.5 font-mono text-[0.88em] font-medium text-foreground select-all"
                  >
                    {inlineFormula}
                  </code>
                );
              }
              return <span key={subIndex}>{inlinePart}</span>;
            })}
          </span>
        );
      })}
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
  content: ChatMessage["content"];
  loading?: boolean;
  compact: boolean;
}) {
  const isUser = role === "user";
  const text = getMessageText(content);
  const images = getMessageImages(content);
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
          <div className="space-y-2">
            {images.length > 0 && (
              <div className="grid gap-2">
                {images.map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt="Lampiran gambar"
                    className="max-h-56 rounded-xl border border-border/60 object-contain"
                  />
                ))}
              </div>
            )}
            {text && <MathMessageContent text={text} isUser={isUser} />}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function buildUserContent(text: string, images: ImageAttachment[]): ChatMessage["content"] {
  if (images.length === 0) return text;
  return [
    ...(text ? [{ type: "text" as const, text }] : []),
    ...images.map((image) => ({
      type: "image_url" as const,
      image_url: { url: image.dataUrl },
    })),
  ];
}

function getMessageText(content: ChatMessage["content"]) {
  if (typeof content === "string") return content;
  return content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

function getMessageImages(content: ChatMessage["content"]) {
  if (typeof content === "string") return [];
  return content
    .filter((part) => part.type === "image_url")
    .map((part) => part.image_url.url);
}

function readImageAttachment(file: File): Promise<ImageAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Invalid image"));
        return;
      }
      resolve({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        name: file.name,
        dataUrl: reader.result,
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
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
