import type { ChatMessage, Student } from "@/lib/types";
import { api, getToken } from "@/services/api";

/**
 * Streams an AI Assistant reply from the backend edge function.
 * Yields incremental text deltas via onDelta — never buffers the entire response.
 */
const CHAT_URL = api.chatUrl();

interface StreamArgs {
  messages: ChatMessage[];
  students: Student[];
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError: (status: number, message: string) => void;
}

export async function streamAssistant({
  messages,
  students,
  onDelta,
  onDone,
  onError,
}: StreamArgs): Promise<void> {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken() ?? ""}`,
    },
    body: JSON.stringify({ messages, students }),
  });

  if (!resp.ok) {
    let msg = "Gagal menghubungi AI";
    try {
      const j = await resp.json();
      msg = j.error || msg;
    } catch {
      // ignore
    }
    onError(resp.status, msg);
    return;
  }

  if (!resp.body) {
    onError(500, "Tidak ada respons dari AI");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;

  while (!done) {
    const { value, done: streamDone } = await reader.read();
    if (streamDone) break;
    buf += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const json = line.slice(6).trim();
      if (json === "[DONE]") {
        done = true;
        break;
      }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content as
          | string
          | undefined;
        if (content) onDelta(content);
      } catch {
        // partial JSON — push back and wait for more
        buf = line + "\n" + buf;
        break;
      }
    }
  }

  onDone();
}
