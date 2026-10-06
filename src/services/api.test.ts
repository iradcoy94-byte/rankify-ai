import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, clearToken, setToken } from "./api";
import { memoryStorage } from "@/test/storage";
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubGlobal("localStorage", memoryStorage());
  fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());
describe("mock API contract", () => {
  it("normalizes nullable numeric student fields and attaches bearer authentication", async () => {
    setToken("mock-session");
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ students: [{ id: "one", name: "Andi", score: "85.5", pretest: null, posttest: "90", meeting: "2" }, { id: "empty", name: "Budi", score: null }] })));
    const rows = await api.listStudents();
    expect(rows[0]).toMatchObject({ score: 85.5, pretest: undefined, posttest: 90, meeting: 2 });
    expect(rows[1].score).toBeNaN();
    expect(fetchMock.mock.calls[0][1].headers.get("Authorization")).toBe("Bearer mock-session");
    clearToken();
  });
  it("preserves HTTP status and handles non-JSON or structured error bodies", async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"error":"invalid row"}', { status: 422 }));
    await expect(api.listStudents()).rejects.toMatchObject({ status: 422, message: "invalid row" });
    fetchMock.mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    await expect(api.listStudents()).rejects.toMatchObject({ status: 503, message: "Request gagal" });
    fetchMock.mockResolvedValueOnce(new Response('{"error":{"message":"private detail"}}', { status: 403 }));
    await expect(api.listStudents()).rejects.toMatchObject({ status: 403, message: "Request gagal" });
  });
  it("rejects malformed successful JSON and unexpected list shapes", async () => {
    fetchMock.mockResolvedValueOnce(new Response("not-json"));
    await expect(api.listStudents()).rejects.toBeInstanceOf(ApiError);
    for (const students of [null, {}, [null]]) {
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ students })));
      await expect(api.listStudents()).rejects.toMatchObject({ message: "Data siswa tidak valid" });
    }
  });
  it("uses one PUT for replacement and encodes record IDs", async () => {
    fetchMock.mockImplementation(async () => new Response('{"ok":true}'));
    await api.replaceStudents([]);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "PUT", body: '{"students":[]}' });
    await api.deleteStudent("a/b?x");
    expect(fetchMock.mock.calls[1][0]).toBe(api.baseUrl + "/students/a%2Fb%3Fx");
  });
  it("accepts empty 204 mutations and propagates network rejection", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(api.clearStudents()).resolves.toBeUndefined();
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await expect(api.saveStudents([])).rejects.toThrow("offline");
  });
});
