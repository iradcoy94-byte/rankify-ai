import type { ChatMessage } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/services/api";
import type { Role } from "@/context/AuthContext";

/**
 * Streams an AI Assistant reply from the backend edge function.
 * Yields incremental text deltas via onDelta — never buffers the entire response.
 */
interface StreamArgs {
  messages: ChatMessage[];
  role?: Role;
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError: (status: number, message: string) => void;
}

export async function streamAssistant({
  messages,
  role = "siswa",
  onDelta,
  onDone,
  onError,
}: StreamArgs): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    onError(401, "Sesi login sudah berakhir. Masuk kembali untuk menggunakan tutor.");
    return;
  }
  const functionName = role === "siswa" ? "tutor-chat" : "teacher-insights";
  const resp = await fetch(api.chatUrl(functionName), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    // The function resolves the authenticated student's own progress server-side.
    // Names, NISN, and browser-provided class datasets are never sent to the model.
    body: JSON.stringify({ messages }),
  });

    if (!resp.ok) {
      let msg = "Gagal menghubungi AI";
      try {
        const j = await resp.json();
        if (typeof j.error === "string") msg = j.error;
      } catch {
        // ignore
      }
      fail(resp.status, msg);
      return;
    }

    if (!resp.body) {
      fail(500, "Tidak ada respons dari AI");
      return;
    }

    reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let data: string[] = [];
    const dispatch = () => {
      if (!data.length || finished) return;
      const text = data.join("\n").trim();
      data = [];
      if (text === "[DONE]") {
        finished = true;
        onDone();
        return;
      }
      let parsed;
      try { parsed = JSON.parse(text); } catch {
        fail(0, "Frame AI tidak valid. Coba lagi.");
        return;
      }
      if (parsed?.error) {
        fail(0, typeof parsed.error === "string" ? parsed.error : "AI mengembalikan kesalahan");
        return;
      }
      const content = parsed?.choices?.[0]?.delta?.content;
      if (typeof content === "string" && content) onDelta(content);
    };
    const line = (value: string) => {
      const text = value.endsWith("\r") ? value.slice(0, -1) : value;
      if (!text) dispatch();
      else if (text.startsWith("data:")) data.push(text.slice(5).replace(/^ /, ""));
    };
    while (!finished) {
      const { value, done: streamDone } = await reader.read();
      if (streamDone) {
        buf += decoder.decode();
        if (buf) line(buf);
        dispatch();
        if (!finished) fail(0, "Stream berakhir tidak sempurna. Coba lagi.");
        break;
      }
      buf += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const value = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        line(value);
        if (finished) break;
      }
      if (buf.length + data.join("\n").length > 1_048_576) fail(0, "Frame AI terlalu besar");
    }
  } catch (error) {
    fail(0, error instanceof Error ? error.message : "Gagal membaca respons AI");
  } finally {
    if (reader) {
      try { await reader.cancel(); } catch { /* Connection may already be closed. */ }
      reader.releaseLock();
    }
  }
}
