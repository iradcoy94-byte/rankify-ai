
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { ChatMessage, Student } from "@/lib/types";

// Mock Supabase agar pengujian tidak memerlukan sesi login asli.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: "mock-token",
          },
        },
      }),
    },
  },
}));

// Mock API agar pengujian tidak membutuhkan konfigurasi Supabase.
vi.mock("@/services/api", () => ({
  api: {
    chatUrl: () => "/__mock_api__/chat",
  },
}));

import { streamAssistant } from "@/services/aiService";
import { api } from "@/services/api";

const CHAT_URL = api.chatUrl();

const SAMPLE_MESSAGES: ChatMessage[] = [
  { role: "user", content: "Halo" },
];

const SAMPLE_STUDENTS: Student[] = [];

function streamFromChunks(
  chunks: string[],
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

function okResponse(
  body: ReadableStream<Uint8Array> | null,
): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
    },
  });
}

function makeArgs() {
  const deltas: string[] = [];
  let done = false;
  const error = { status: -1, message: "" };

  const args = {
    messages: SAMPLE_MESSAGES,
    role: "siswa" as const,
    onDelta: (chunk: string) => deltas.push(chunk),
    onDone: () => {
      done = true;
    },
    onError: (status: number, message: string) => {
      error.status = status;
      error.message = message;
    },
  };

  return {
    args,
    deltas,
    get done() {
      return done;
    },
    error,
  };
}

describe("streamAssistant", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("accumulates deltas from valid SSE frames", async () => {
    vi.mocked(fetch).mockResolvedValue(
      okResponse(
        streamFromChunks([
          'data: {"choices":[{"delta":{"content":"Halo"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":" guru"}}]}\n\n',
          "data: [DONE]\n\n",
        ]),
      ),
    );

    const t = makeArgs();
    await streamAssistant(t.args);

    expect(t.deltas.join("")).toBe("Halo guru");
    expect(t.done).toBe(true);
    expect(t.error.status).toBe(-1);
  });

  it("handles UTF-8 characters and CRLF boundaries", async () => {
    const payload =
      'data: {"choices":[{"delta":{"content":"café 🌱"}}]}\r\n\r\n' +
      "data: [DONE]\r\n\r\n";

    const bytes = new TextEncoder().encode(payload);

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const byte of bytes) {
          controller.enqueue(new Uint8Array([byte]));
        }
        controller.close();
      },
    });

    vi.mocked(fetch).mockResolvedValue(okResponse(body));

    const t = makeArgs();
    await streamAssistant(t.args);

    expect(t.deltas).toEqual(["café 🌱"]);
    expect(t.done).toBe(true);
    expect(t.error.status).toBe(-1);
  });

  it("supports multiline data, comments, and event fields", async () => {
    vi.mocked(fetch).mockResolvedValue(
      okResponse(
        streamFromChunks([
          ': heartbeat\nevent: token\ndata: {"choices":\ndata: [{"delta":{"content":"OK"}}]}\n\n',
          "data: [DONE]\n\n",
        ]),
      ),
    );

    const t = makeArgs();
    await streamAssistant(t.args);

    expect(t.deltas.join("")).toBe("OK");
    expect(t.done).toBe(true);
    expect(t.error.status).toBe(-1);
  });

  it("reassembles frames split across chunks", async () => {
    const payload =
      'data: {"choices":[{"delta":{"content":"split-ok"}}]}\n\n';

    const chunks: string[] = [];

    for (let i = 0; i < payload.length; i += 3) {
      chunks.push(payload.slice(i, i + 3));
    }

    vi.mocked(fetch).mockResolvedValue(
      okResponse(
        streamFromChunks([...chunks, "data: [DONE]\n\n"]),
      ),
    );

    const t = makeArgs();
    await streamAssistant(t.args);

    expect(t.deltas.join("")).toBe("split-ok");
    expect(t.done).toBe(true);
  });

  it("ignores frames without delta content", async () => {
    vi.mocked(fetch).mockResolvedValue(
      okResponse(
        streamFromChunks([
          'data: {"choices":[{"delta":{}}]}\n\n',
          'data: {"choices":[]}\n\n',
          'data: {"id":"abc"}\n\n',
          'data: {"choices":[{"delta":{"content":"yes"}}]}\n\n',
          "data: [DONE]\n\n",
        ]),
      ),
    );

    const t = makeArgs();
    await streamAssistant(t.args);

    expect(t.deltas.join("")).toBe("yes");
    expect(t.done).toBe(true);
  });

  it("reports premature EOF without falsely finishing", async () => {
    vi.mocked(fetch).mockResolvedValue(
      okResponse(
        streamFromChunks([
          'data: {"choices":[{"delta":{"content":"partial"}}]}\n\n',
          'data: {"choices":',
        ]),
      ),
    );

    const t = makeArgs();
    await streamAssistant(t.args);

    expect(t.deltas.join("")).toBe("partial");
    expect(t.done).toBe(false);
    expect(t.error.status).toBe(0);
  });

  it("rejects malformed SSE JSON", async () => {
    vi.mocked(fetch).mockResolvedValue(
      okResponse(
        streamFromChunks([
          "data: invalid-json\n\n",
          "data: [DONE]\n\n",
        ]),
      ),
    );

    const t = makeArgs();
    await streamAssistant(t.args);

    expect(t.deltas).toEqual([]);
    expect(t.done).toBe(false);
    expect(t.error.status).toBe(0);
    expect(t.error.message).toBe("Frame AI tidak valid. Coba lagi.");
  });

  it("propagates provider errors", async () => {
    vi.mocked(fetch).mockResolvedValue(
      okResponse(
        streamFromChunks([
          'data: {"error":"provider unavailable"}\n\n',
          "data: [DONE]\n\n",
        ]),
      ),
    );

    const t = makeArgs();
    await streamAssistant(t.args);

    expect(t.error).toEqual({
      status: 0,
      message: "provider unavailable",
    });
    expect(t.done).toBe(false);
  });

  it("reports HTTP errors with their status", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ error: "retry later" }),
        { status: 429 },
      ),
    );

    const t = makeArgs();
    await streamAssistant(t.args);

    expect(t.error).toEqual({
      status: 429,
      message: "retry later",
    });
    expect(t.done).toBe(false);
  });

  it("reports an absent response body", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null),
    );

    const t = makeArgs();
    await streamAssistant(t.args);

    expect(t.error).toEqual({
      status: 500,
      message: "Tidak ada respons dari AI",
    });
  });

  it("reports fetch failures", async () => {
    vi.mocked(fetch).mockRejectedValue(
      new Error("offline"),
    );

    const t = makeArgs();
    await streamAssistant(t.args);

    expect(t.error).toEqual({
      status: 0,
      message: "offline",
    });
  });

  it("sends the Supabase access token in the request", async () => {
    vi.mocked(fetch).mockResolvedValue(
      okResponse(streamFromChunks(["data: [DONE]\n\n"])),
    );

    const t = makeArgs();
    await streamAssistant(t.args);

    expect(fetch).toHaveBeenCalledTimes(1);

    const [url, init] = vi.mocked(fetch).mock.calls[0];

    expect(url).toBe(CHAT_URL);
    expect(init?.method).toBe("POST");

    const headers = new Headers(init?.headers);

    expect(headers.get("Authorization")).toBe("Bearer mock-token");
    expect(headers.get("Content-Type")).toBe("application/json");
  });
});