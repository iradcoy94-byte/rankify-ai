import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { streamAssistant } from "@/services/aiService";
import { api } from "@/services/api";
import type { ChatMessage, Student } from "@/lib/types";

const CHAT_URL = api.chatUrl();

/** Build a ReadableStream<Uint8Array> from an array of string chunks. */
function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
}

function okResponse(body: ReadableStream<Uint8Array> | null): Response {
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

const SAMPLE_MESSAGES: ChatMessage[] = [{ role: "user", content: "Halo" }];
const SAMPLE_STUDENTS: Student[] = [];

function makeArgs() {
  const deltas: string[] = [];
  let done = false;
  const error: { status: number; message: string } | null = { status: -1, message: "" };
  const args = {
    messages: SAMPLE_MESSAGES,
    students: SAMPLE_STUDENTS,
    onDelta: (c: string) => deltas.push(c),
    onDone: () => { done = true; },
    onError: (status: number, message: string) => { error.status = status; error.message = message; },
  };
  return { args, deltas, get done() { return done; }, error, get called() { return done || error.status !== -1; } };
}

describe("streamAssistant — happy path", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("accumulates deltas from well-formed SSE frames", async () => {
    const body = streamFromChunks([
      "data: {\"choices\":[{\"delta\":{\"content\":\"Halo\"}}]}\n\n",
      "data: {\"choices\":[{\"delta\":{\"content\":\" guru\"}}]}\n\n",
      "data: [DONE]\n\n",
    ]);
    vi.mocked(fetch).mockResolvedValue(okResponse(body));

    const t = makeArgs();
    await streamAssistant(t.args);
    expect(t.deltas.join("")).toBe("Halo guru");
    expect(t.done).toBe(true);
    expect(t.error.status).toBe(-1);
  });

  it("ignores comments and empty lines", async () => {
    const body = streamFromChunks([
      ": ping\n\n",
      "\n",
      "data: {\"choices\":[{\"delta\":{\"content\":\"ok\"}}]}\n\n",
      "data: [DONE]\n\n",
    ]);
    vi.mocked(fetch).mockResolvedValue(okResponse(body));

    const t = makeArgs();
    await streamAssistant(t.args);
    expect(t.deltas.join("")).toBe("ok");
  });

  it("ignores frames without a delta content field", async () => {
    const body = streamFromChunks([
      "data: {\"choices\":[{\"delta\":{}}]}\n\n",
      "data: {\"choices\":[]}\n\n",
      "data: {\"id\":\"abc\"}\n\n",
      "data: {\"choices\":[{\"delta\":{\"content\":\"yes\"}}]}\n\n",
      "data: [DONE]\n\n",
    ]);
    vi.mocked(fetch).mockResolvedValue(okResponse(body));

    const t = makeArgs();
    await streamAssistant(t.args);
    expect(t.deltas.join("")).toBe("yes");
  });

  it("handles CRLF line endings", async () => {
    const body = streamFromChunks([
      "data: {\"choices\":[{\"delta\":{\"content\":\"a\"}}]}\r\n\r\n",
      "data: {\"choices\":[{\"delta\":{\"content\":\"b\"}}]}\r\n\r\n",
      "data: [DONE]\r\n\r\n",
    ]);
    vi.mocked(fetch).mockResolvedValue(okResponse(body));

    const t = makeArgs();
    await streamAssistant(t.args);
    expect(t.deltas.join("")).toBe("ab");
  });
});

describe("streamAssistant — split / partial frames", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("reassembles a JSON payload split across chunks", async () => {
    const full = "data: {\"choices\":[{\"delta\":{\"content\":\"split-ok\"}}]}\n\n";
    // Split into 1-byte-ish chunks so the newline arrives late.
    const chunks: string[] = [];
    for (let i = 0; i < full.length; i += 3) chunks.push(full.slice(i, i + 3));
    const body = streamFromChunks([...chunks, "data: [DONE]\n\n"]);
    vi.mocked(fetch).mockResolvedValue(okResponse(body));

    const t = makeArgs();
    await streamAssistant(t.args);
    expect(t.deltas.join("")).toBe("split-ok");
    expect(t.done).toBe(true);
  });

  it("handles a frame split exactly at the data: prefix", async () => {
    const body = streamFromChunks([
      "dat",
      "a: ",
      "{\"choices\":[{\"delta\":{\"content\":\"x\"}}]}",
      "\n\n",
      "data: [DONE]\n\n",
    ]);
    vi.mocked(fetch).mockResolvedValue(okResponse(body));

    const t = makeArgs();
    await streamAssistant(t.args);
    expect(t.deltas.join("")).toBe("x");
  });

  it("reassembles two frames delivered in one chunk", async () => {
    const body = streamFromChunks([
      "data: {\"choices\":[{\"delta\":{\"content\":\"A\"}}]}\n\n" +
        "data: {\"choices\":[{\"delta\":{\"content\":\"B\"}}]}\n\n",
      "data: [DONE]\n\n",
    ]);
    vi.mocked(fetch).mockResolvedValue(okResponse(body));

    const t = makeArgs();
    await streamAssistant(t.args);
    expect(t.deltas.join("")).toBe("AB");
  });

  it("does not emit a partial JSON delta when the stream ends mid-frame", async () => {
    // Stream closes before the newline for the final frame.
    const body = streamFromChunks([
      "data: {\"choices\":[{\"delta\":{\"content\":\"seen\"}}]}\n\n",
      "data: {\"choices\":[{\"delta\":{\"content\":\"lost\"}}]}", // no newline
    ]);
    vi.mocked(fetch).mockResolvedValue(okResponse(body));

    const t = makeArgs();
    await streamAssistant(t.args);
    expect(t.deltas.join("")).toBe("seen");
    // onDone still fires — a truncated tail should not hang or crash.
    expect(t.done).toBe(true);
  });
});

describe("streamAssistant — premature EOF", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("ends cleanly on an empty stream with no [DONE]", async () => {
    const body = streamFromChunks([]);
    vi.mocked(fetch).mockResolvedValue(okResponse(body));

    const t = makeArgs();
    await streamAssistant(t.args);
    expect(t.deltas).toEqual([]);
    expect(t.done).toBe(true);
  });

  it("stops at [DONE] and ignores trailing data", async () => {
    const body = streamFromChunks([
      "data: {\"choices\":[{\"delta\":{\"content\":\"first\"}}]}\n\n",
      "data: [DONE]\n\n",
      "data: {\"choices\":[{\"delta\":{\"content\":\"after\"}}]}\n\n",
    ]);
    vi.mocked(fetch).mockResolvedValue(okResponse(body));

    const t = makeArgs();
    await streamAssistant(t.args);
    expect(t.deltas.join("")).toBe("first");
  });

  it("handles a stream that errors mid-read", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(
          "data: {\"choices\":[{\"delta\":{\"content\":\"partial\"}}]}\n\n",
        ));
        // Error asynchronously so the enqueued chunk is still readable
        // (controller.error() drains the queue synchronously).
        setTimeout(() => controller.error(new Error("network reset")), 30);
      },
    });
    vi.mocked(fetch).mockResolvedValue(okResponse(body));

    const t = makeArgs();
    await expect(streamAssistant(t.args)).rejects.toThrow("network reset");
    expect(t.deltas.join("")).toBe("partial");
    expect(t.called).toBe(false);
  });
});

describe("streamAssistant — error paths", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("reports a JSON error body on a non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "Token habis" }), { status: 401 }),
    );
    const t = makeArgs();
    await streamAssistant(t.args);
    expect(t.error).toEqual({ status: 401, message: "Token habis" });
    expect(t.done).toBe(false);
  });

  it("falls back to the generic message for a non-JSON error body", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("<html>502</html>", { status: 502 }),
    );
    const t = makeArgs();
    await streamAssistant(t.args);
    expect(t.error.status).toBe(502);
    expect(t.error.message).toBe("Gagal menghubungi AI");
  });

  it("reports 500 when the response has no body", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(null));
    const t = makeArgs();
    await streamAssistant(t.args);
    expect(t.error).toEqual({ status: 500, message: "Tidak ada respons dari AI" });
  });

  it("sends the bearer token from localStorage", async () => {
    localStorage.setItem("rankify_token", "secret-abc");
    const body = streamFromChunks(["data: [DONE]\n\n"]);
    vi.mocked(fetch).mockResolvedValue(okResponse(body));

    const t = makeArgs();
    await streamAssistant(t.args);

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(CHAT_URL);
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer secret-abc",
    );
    expect(init?.method).toBe("POST");
  });

  it("sends an empty bearer token when not authenticated", async () => {
    const body = streamFromChunks(["data: [DONE]\n\n"]);
    vi.mocked(fetch).mockResolvedValue(okResponse(body));

    const t = makeArgs();
    await streamAssistant(t.args);

    const init = vi.mocked(fetch).mock.calls[0][1];
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer ",
    );
  });
});
