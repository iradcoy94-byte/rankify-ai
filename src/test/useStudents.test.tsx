import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { toast } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useStudents } from "@/hooks/useStudents";
import { mulberry32, makeSeededStudents, testSeed } from "./rng";

/**
 * Render useAuth + useStudents under ONE AuthProvider so the students hook
 * observes the same session the login call created.
 */
function renderStudents() {
  return renderHook(() => ({ auth: useAuth(), students: useStudents() }), {
    wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
  });
}

/**
 * Mock fetch: /auth/login succeeds for the given role and /students returns
 * `students.body` with `students.status`. Both responses are installed up front
 * because the students sync effect fires in the same act() as the login call.
 */
function mockBackend(opts: {
  role?: "guru" | "siswa";
  students?: { status?: number; body: unknown };
}) {
  const role = opts.role ?? "guru";
  const email = role === "guru" ? "guru@rankify.test" : "siswa@rankify.test";
  const apiRole = role === "guru" ? "guru" : "peserta_didik";
  vi.mocked(fetch).mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (url.includes("/auth/login")) {
      return new Response(
        JSON.stringify({
          token: "test-token",
          user: { id: 1, name: role, email, role: apiRole },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(JSON.stringify(opts.students?.body ?? { students: [] }), {
      status: opts.students?.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}

/** Log in as `role` using the responses installed by mockBackend(). */
async function mockLogin(
  t: ReturnType<typeof renderStudents>,
  role: "guru" | "siswa",
  opts: { clear?: boolean } = {},
) {
  const auth = t.result.current.auth;
  const email = role === "guru" ? "guru@rankify.test" : "siswa@rankify.test";
  await act(async () => {
    await auth.login(role, email, "rankify123");
  });
  if (opts.clear !== false) {
    vi.mocked(fetch).mockClear();
  }
}

/** Switch a logged-in session to local-only mode (no backend token). */
function localOnly() {
  localStorage.removeItem("rankify_token");
}

describe("useStudents — read-only student behaviour", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    localStorage.clear();
    sessionStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("denies every mutation when the session is a student", async () => {
    const t = renderStudents();
    await mockLogin(t, "siswa");
    expect(t.result.current.auth.isReadOnly).toBe(true);
    expect(t.result.current.auth.canManageData).toBe(false);
    localOnly();

    const before = t.result.current.students.students;

    await act(async () => {
      await t.result.current.students.appendStudents(makeSeededStudents(5, testSeed()));
      await t.result.current.students.replaceAll(makeSeededStudents(3, testSeed() + 1));
      await t.result.current.students.updateField(before[0]?.id ?? "x", { score: 10 });
      await t.result.current.students.removeRow(before[0]?.id ?? "x");
      await t.result.current.students.addRow("XII A");
      await t.result.current.students.clear();
    });

    expect(t.result.current.students.students).toEqual(before);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
    expect(t.result.current.students.canManageData).toBe(false);
  });

  it("toasts a read-only warning exactly once per blocked action", async () => {
    const t = renderStudents();
    await mockLogin(t, "siswa");
    localOnly();

    const warned = vi.fn();
    const orig = toast.warning;
    (toast as unknown as { warning: unknown }).warning = warned;
    try {
      await act(async () => {
        await t.result.current.students.clear();
      });
    } finally {
      (toast as unknown as { warning: unknown }).warning = orig;
    }
    expect(warned).toHaveBeenCalledTimes(1);
    expect(String(warned.mock.calls[0][0])).toContain("hanya bisa melihat");
  });

  it("exposes the same list to students as to teachers (no filtering)", async () => {
    const rows = makeSeededStudents(8, testSeed() + 3);
    localStorage.setItem("rankify.students.shared.v1", JSON.stringify(rows));

    const teacher = renderStudents();
    await mockLogin(teacher, "guru");
    localOnly();
    expect(teacher.result.current.students.students).toHaveLength(8);

    const student = renderStudents();
    await mockLogin(student, "siswa");
    localOnly();
    expect(student.result.current.students.students.map((s) => s.name)).toEqual(
      teacher.result.current.students.students.map((s) => s.name),
    );
  });
});

describe("useStudents — local-only persistence (no backend session)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    localStorage.clear();
    sessionStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("persists appended rows to localStorage and reloads them", async () => {
    const t = renderStudents();
    await mockLogin(t, "guru");
    localOnly();
    expect(localStorage.getItem("rankify_token")).toBe(null);

    await act(async () => {
      await t.result.current.students.appendStudents(makeSeededStudents(4, testSeed()));
    });
    expect(t.result.current.students.students).toHaveLength(4);

    const stored = JSON.parse(
      localStorage.getItem("rankify.students.shared.v1") ?? "[]",
    );
    expect(stored).toHaveLength(4);

    const reloaded = renderStudents();
    expect(reloaded.result.current.students.students.map((s) => s.name)).toEqual(
      t.result.current.students.students.map((s) => s.name),
    );
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("recomputes dense ranking after append", async () => {
    const t = renderStudents();
    await mockLogin(t, "guru");
    localOnly();
    await act(async () => {
      await t.result.current.students.appendStudents(makeSeededStudents(6, testSeed() + 7));
    });
    const ranks = t.result.current.students.students.map((s) => s.rank);
    expect(Math.min(...ranks)).toBe(1);
    expect(ranks).toContain(1);
  });

  it("updateField validates and recomputes", async () => {
    const t = renderStudents();
    await mockLogin(t, "guru");
    localOnly();
    await act(async () => {
      await t.result.current.students.appendStudents(makeSeededStudents(3, testSeed() + 9));
    });
    const first = t.result.current.students.students[0];
    await act(async () => {
      await t.result.current.students.updateField(first.id, { score: 200 });
    });
    const updated = t.result.current.students.students.find((s) => s.id === first.id);
    expect(updated?.isValid).toBe(false);
    expect(updated?.rank).toBe(0);
  });

  it("removeRow drops a row and recomputes", async () => {
    const t = renderStudents();
    await mockLogin(t, "guru");
    localOnly();
    await act(async () => {
      await t.result.current.students.appendStudents(makeSeededStudents(5, testSeed() + 13));
    });
    const id = t.result.current.students.students[2].id;
    await act(async () => {
      await t.result.current.students.removeRow(id);
    });
    expect(t.result.current.students.students.find((s) => s.id === id)).toBeUndefined();
    expect(t.result.current.students.students).toHaveLength(4);
  });

  it("clear empties the list", async () => {
    const t = renderStudents();
    await mockLogin(t, "guru");
    localOnly();
    await act(async () => {
      await t.result.current.students.appendStudents(makeSeededStudents(2, testSeed() + 21));
    });
    await act(async () => {
      await t.result.current.students.clear();
    });
    expect(t.result.current.students.students).toEqual([]);
  });

  it("addRow appends a single invalid empty row", async () => {
    const t = renderStudents();
    await mockLogin(t, "guru");
    localOnly();
    await act(async () => {
      await t.result.current.students.addRow("XII IPA 1");
    });
    expect(t.result.current.students.students).toHaveLength(1);
    expect(t.result.current.students.students[0]).toMatchObject({
      name: "",
      className: "XII IPA 1",
      isValid: false,
    });
  });

  it("keeps ranks consistent across many random appends", async () => {
    const t = renderStudents();
    await mockLogin(t, "guru");
    localOnly();
    const next = mulberry32(testSeed() + 47);
    let total = 0;

    for (let i = 0; i < 8; i++) {
      const n = 2 + Math.floor(next() * 6);
      total += n;
      await act(async () => {
        await t.result.current.students.appendStudents(
          makeSeededStudents(n, Math.floor(next() * 1e9)),
        );
      });
      expect(t.result.current.students.students).toHaveLength(total);
    }

    const byClass = new Map<string, StudentsApi["students"]>();
    for (const s of t.result.current.students.students) {
      const k = s.className ?? "__none__";
      if (!byClass.has(k)) byClass.set(k, []);
      byClass.get(k)!.push(s);
    }
    for (const [, list] of byClass) {
      const valid = list.filter((s) => s.isValid);
      const ranks = valid.map((s) => s.rank).sort((a, b) => a - b);
      expect(ranks[0]).toBe(1);
      for (let i = 1; i < ranks.length; i++) {
        expect(ranks[i]).toBeGreaterThanOrEqual(ranks[i - 1]);
      }
      expect(ranks[ranks.length - 1]).toBeLessThanOrEqual(valid.length);
      for (const s of list) if (!s.isValid) expect(s.rank).toBe(0);
    }
  });
});

describe("useStudents — backend synchronisation", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    localStorage.clear();
    sessionStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("falls back to the local list when listStudents fails", async () => {
    const local = makeSeededStudents(6, testSeed() + 31);
    localStorage.setItem("rankify.students.shared.v1", JSON.stringify(local));

    mockBackend({ students: { status: 401, body: { error: "Token tidak valid" } } });
    const t = renderStudents();
    await mockLogin(t, "guru", { clear: false });

    await act(async () => {
      await vi.waitFor(() => expect(t.result.current.students.isSyncing).toBe(false));
    });

    // The failed sync falls back to the locally persisted list.
    expect(t.result.current.students.students).toHaveLength(6);
    expect(
      vi.mocked(fetch).mock.calls.some((c) => {
        const url = typeof c[0] === "string" ? c[0] : (c[0] as Request).url;
        return url.includes("/students");
      }),
    ).toBe(true);
  });

  it("commits server rows on a successful sync", async () => {
    const serverRows = makeSeededStudents(4, testSeed() + 33).map((s) => ({
      ...s,
      id: `srv-${s.id}`,
    }));
    mockBackend({ students: { status: 200, body: { students: serverRows } } });
    const t = renderStudents();
    await mockLogin(t, "guru", { clear: false });

    await act(async () => {
      await vi.waitFor(() => expect(t.result.current.students.students).toHaveLength(4));
    });
    expect(t.result.current.students.students.every((s) => s.id.startsWith("srv-"))).toBe(true);
  });

  it("does not sync when there is no user session", async () => {
    const t = renderStudents();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
    expect(t.result.current.students.students).toEqual([]);
  });
});

describe("useStudents — stats and classes", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("reports total/valid/invalid counts and an average", () => {
    const rows = makeSeededStudents(10, testSeed() + 41);
    localStorage.setItem("rankify.students.shared.v1", JSON.stringify(rows));
    const t = renderStudents();
    const valid = rows.filter((s) => s.isValid);
    const expectedAvg = Math.round(
      (valid.reduce((a, s) => a + s.score, 0) / Math.max(valid.length, 1)) * 10,
    ) / 10;
    expect(t.result.current.students.stats.total).toBe(rows.length);
    expect(t.result.current.students.stats.valid).toBe(valid.length);
    expect(t.result.current.students.stats.invalid).toBe(rows.length - valid.length);
    expect(t.result.current.students.stats.avg).toBe(expectedAvg);
  });

  it("lists distinct classes sorted alphabetically", () => {
    const rows = makeSeededStudents(20, testSeed() + 43);
    localStorage.setItem("rankify.students.shared.v1", JSON.stringify(rows));
    const t = renderStudents();
    const expected = Array.from(
      new Set(rows.map((s) => (s.className ?? "").trim()).filter(Boolean)),
    ).sort();
    expect(t.result.current.students.classes).toEqual(expected);
  });
});
