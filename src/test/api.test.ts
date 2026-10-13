import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, getToken, setToken, clearToken } from "@/services/api";
import { fromApiStudent } from "@/services/api";

const TOKEN = "test-token-123";
const BASE = api.baseUrl;

function mockJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api — endpoint helpers", () => {
  it("builds absolute URLs from the configured base", () => {
    expect(api.chatUrl()).toBe(`${BASE}/chat`);
  });

  it("baseUrl is non-empty and absolute", () => {
    expect(BASE.length).toBeGreaterThan(0);
    expect(BASE.startsWith("http")).toBe(true);
  });
});

describe("api — success path", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    localStorage.setItem("rankify_token", TOKEN);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("sends GET with the bearer token and parses JSON", async () => {
    vi.mocked(fetch).mockResolvedValue(mockJson({ students: [] }));
    await api.me();

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe(`${BASE}/auth/me`);
    expect(init?.method ?? "GET").toBe("GET");
    expect(init?.headers.get("Authorization")).toBe(`Bearer ${TOKEN}`);
    expect(init?.headers.get("Content-Type")).toBe("application/json");
  });

  it("sends POST with a JSON body", async () => {
    vi.mocked(fetch).mockResolvedValue(mockJson({ token: "t", user: {} }));
    await api.login("guru@x.id", "rahasia");

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe(`${BASE}/auth/login`);
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ email: "guru@x.id", password: "rahasia" }));
  });

  it("omits Authorization when no token is stored", async () => {
    localStorage.removeItem("rankify_token");
    vi.mocked(fetch).mockResolvedValue(mockJson({ students: [] }));
    await api.listStudents();

    const init = vi.mocked(fetch).mock.calls[0][1];
    expect(init?.headers.get("Authorization")).toBe(null);
  });

  it("listStudents coerces null numeric fields to NaN/undefined", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockJson({
        students: [
          { id: "1", name: "Andi", className: "XII A", rank: 1, isValid: true, score: null, meeting: null, pretest: null, posttest: null },
          { id: "2", name: "Budi", className: "XII A", rank: 2, isValid: true, score: "88", meeting: "3", pretest: "10", posttest: "90" },
        ],
      }),
    );
    const rows = await api.listStudents();
    expect(rows).toHaveLength(2);
    expect(Number.isNaN(rows[0].score)).toBe(true);
    expect(rows[0].meeting).toBe(undefined);
    expect(rows[1].score).toBe(88);
    expect(rows[1].meeting).toBe(3);
  });

  it("encodes the student id in the path", async () => {
    vi.mocked(fetch).mockResolvedValue(mockJson({ ok: true }));
    await api.updateStudent("a b/c", { id: "a b/c", name: "x", score: 1, className: "X", rank: 0, isValid: true });

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe(`${BASE}/students/a%20b%2Fc`);
  });
});

describe("api — failure path (mock fetch failures)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    localStorage.setItem("rankify_token", TOKEN);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("throws an Error carrying the server message on 400", async () => {
    vi.mocked(fetch).mockResolvedValue(mockJson({ error: "Email sudah dipakai" }, 400));
    await expect(api.login("a@x.id", "p")).rejects.toThrow("Email sudah dipakai");
  });

  it("falls back to the generic message when the body is not JSON", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("<html>500</html>", { status: 500 }),
    );
    await expect(api.listStudents()).rejects.toThrow("Request gagal");
  });

  it("falls back to the generic message when the body is empty", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 502 }));
    await expect(api.listStudents()).rejects.toThrow("Request gagal");
  });

  it("falls back to the generic message when error key is absent", async () => {
    vi.mocked(fetch).mockResolvedValue(mockJson({ detail: "nope" }, 404));
    await expect(api.deleteStudent("1")).rejects.toThrow("Request gagal");
  });

  it("propagates network errors from fetch", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Failed to fetch"));
    await expect(api.listStudents()).rejects.toThrow("Failed to fetch");
  });

  it("surfaces an unauthorized message from the server on 401", async () => {
    vi.mocked(fetch).mockResolvedValue(mockJson({ error: "Token tidak valid" }, 401));
    await expect(api.me()).rejects.toThrow("Token tidak valid");
  });
});

describe("api — token management", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("getToken returns null when nothing is stored", () => {
    expect(getToken()).toBe(null);
  });

  it("setToken/getToken round-trips the value", () => {
    setToken(TOKEN);
    expect(getToken()).toBe(TOKEN);
  });

  it("clearToken removes the stored value", () => {
    setToken(TOKEN);
    clearToken();
    expect(getToken()).toBe(null);
  });
});

describe("fromApiStudent — normalisation", () => {
  const base = { id: "1", name: "Andi", className: "XII A", rank: 1, isValid: true };

  it("converts null numerics to NaN/undefined", () => {
    const out = fromApiStudent({ ...base, score: null, meeting: null, pretest: null, posttest: null });
    expect(Number.isNaN(out.score)).toBe(true);
    expect(out.meeting).toBe(undefined);
    expect(out.pretest).toBe(undefined);
    expect(out.posttest).toBe(undefined);
  });

  it("converts undefined numerics to NaN/undefined", () => {
    const out = fromApiStudent({ ...base, score: undefined });
    expect(Number.isNaN(out.score)).toBe(true);
  });

  it("coerces numeric strings to numbers", () => {
    const out = fromApiStudent({ ...base, score: "95", meeting: "2", pretest: "8", posttest: "90" });
    expect(out.score).toBe(95);
    expect(out.meeting).toBe(2);
    expect(out.pretest).toBe(8);
    expect(out.posttest).toBe(90);
  });

  it("preserves numbers as-is", () => {
    const out = fromApiStudent({ ...base, score: 95, meeting: 2 });
    expect(out.score).toBe(95);
    expect(out.meeting).toBe(2);
  });
});
