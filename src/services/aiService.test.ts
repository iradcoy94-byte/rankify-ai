import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { streamAssistant } from "./aiService";
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
vi.mock("@/services/api", () => ({ 
  api: { 
    chatUrl: () => "/__mock_api__/chat" }, getToken: () => "mock-token" 
  }
));

const delta = (text: string) => `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
const terminal = "data: [DONE]\n\n";
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => vi.unstubAllGlobals());
async function run(chunks: string[]) {
  fetchMock.mockResolvedValue(new Response(new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    },
  })));
  return invoke();
}
async function invoke() {
  const callbacks = { onDelta: vi.fn(), onDone: vi.fn(), onError: vi.fn() };
  await streamAssistant({ messages: [], ...callbacks });
  return callbacks;
}
describe("mock AI SSE", () => {
  it("buffers every single-byte boundary including UTF-8 and CRLF", async () => {
    const payload = (delta("café 🌱") + terminal).replace(/\n/g, "\r\n").replace(/data: /g, "data:");
    const bytes = new TextEncoder().encode(payload);
    fetchMock.mockResolvedValue(new Response(new ReadableStream({ start(c) {
      for (const byte of bytes) c.enqueue(new Uint8Array([byte])); c.close();
    } })));
    const result = await invoke();
    expect(result.onDelta.mock.calls).toEqual([["café 🌱"]]);
    expect(result.onDone).toHaveBeenCalledTimes(1);
    expect(result.onError).not.toHaveBeenCalled();
  });
  it("accumulates deltas and accepts a terminal frame without final newline", async () => {
    const result = await run([delta("Halo "), delta("guru"), "data:[DONE]"]);
    expect(result.onDelta.mock.calls.flat().join("")).toBe("Halo guru");
    expect(result.onDone).toHaveBeenCalledTimes(1);
  });
  it("supports multiline data, comments and event fields", async () => {
    const result = await run([': heartbeat\nevent: token\ndata: {"choices":\ndata: [{"delta":{"content":"OK"}}]}\n\n' + terminal]);
    expect(result.onDelta).toHaveBeenCalledWith("OK");
    expect(result.onError).not.toHaveBeenCalled();
  });
  it("reports partial EOF without falsely finishing", async () => {
    const result = await run([delta("partial"), 'data: {"choices":']);
    expect(result.onDone).not.toHaveBeenCalled();
    expect(result.onError).toHaveBeenCalledTimes(1);
  });
  it("rejects malformed frames even if a terminal marker follows", async () => {
    const result = await run(["data: invalid-json\n\n", delta("ignored"), terminal]);
    expect(result.onDelta).not.toHaveBeenCalled();
    expect(result.onDone).not.toHaveBeenCalled();
    expect(result.onError).toHaveBeenCalledTimes(1);
  });
  it("propagates streamed provider errors", async () => {
    const result = await run(['data: {"error":"provider unavailable"}\n\n' + terminal]);
    expect(result.onError).toHaveBeenCalledWith(0, "provider unavailable");
    expect(result.onDone).not.toHaveBeenCalled();
  });
  it("reports an HTTP error with its status", async () => {
    fetchMock.mockResolvedValue(new Response('{"error":"retry later"}', { status: 429 }));
    const result = await invoke();
    expect(result.onError).toHaveBeenCalledWith(429, "retry later");
    expect(result.onDone).not.toHaveBeenCalled();
  });
  it("handles absent response bodies and fetch/read failures", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null));
    expect((await invoke()).onError).toHaveBeenCalledWith(500, "Tidak ada respons dari AI");
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    expect((await invoke()).onError).toHaveBeenCalledWith(0, "offline");
    fetchMock.mockResolvedValueOnce(new Response(new ReadableStream({ start(c) { c.error(new Error("broken reader")); } })));
    expect((await invoke()).onError).toHaveBeenCalledWith(0, "broken reader");
  });
});
