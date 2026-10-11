import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/api";
import { memoryStorage } from "@/test/storage";
import { useStudents } from "./useStudents";
import type { Student } from "@/lib/types";
const { auth, warning } = vi.hoisted(() => ({
  auth: { canManageData: true, user: { email: "guru@mock.test" } }, warning: vi.fn(),
}));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("sonner", () => ({ toast: { warning, error: vi.fn() } }));
const key = "rankify.students.shared.v1";
const row = (id: string, score = 90): Student => ({ id, name: id, score, rank: 1, isValid: true });
const cached = () => JSON.parse(localStorage.getItem(key) ?? "[]") as Student[];
beforeEach(() => {
  auth.canManageData = true; auth.user = { email: "guru@mock.test" }; warning.mockClear();
  vi.stubGlobal("localStorage", memoryStorage());
  localStorage.setItem("rankify_token", "mock-session");
  localStorage.setItem(key, JSON.stringify([row("Andi")]));
  vi.spyOn(api, "listStudents").mockResolvedValue([row("Andi")]);
  for (const method of ["saveStudents", "updateStudent", "deleteStudent", "clearStudents", "replaceStudents"] as const) {
    vi.spyOn(api, method).mockResolvedValue({ ok: true });
  }
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function mount() {
  const hook = renderHook(() => useStudents());
  await waitFor(() => expect(hook.result.current.isSyncing).toBe(false));
  return hook;
}
describe("student synchronization", () => {
  it("renders pending import but only caches confirmed data, then rolls back failure", async () => {
    let reject!: (error: Error) => void;
    vi.mocked(api.saveStudents).mockReturnValueOnce(new Promise((_resolve, fail) => { reject = fail; }));
    const hook = await mount(); let pending!: Promise<boolean>;
    act(() => { pending = hook.result.current.appendStudents([row("Budi")]); });
    expect(hook.result.current.students).toHaveLength(2);
    expect(cached().map(s => s.id)).toEqual(["Andi"]);
    await waitFor(() => expect(api.saveStudents).toHaveBeenCalledTimes(1));
    await act(async () => { reject(new Error("offline")); expect(await pending).toBe(false); });
    expect(hook.result.current.students.map(s => s.id)).toEqual(["Andi"]);
    expect(cached().map(s => s.id)).toEqual(["Andi"]);
  });
  it("serializes concurrent edits without persisting fields from a failed earlier edit", async () => {
    vi.mocked(api.updateStudent).mockRejectedValueOnce(new Error("first failed"));
    const hook = await mount();
    await act(async () => {
      const first = hook.result.current.updateField("Andi", { name: "Unconfirmed" });
      const second = hook.result.current.updateField("Andi", { score: 95 });
      expect(await Promise.all([first, second])).toEqual([false, true]);
    });
    expect(vi.mocked(api.updateStudent).mock.calls[1][1]).toMatchObject({ name: "Andi", score: 95 });
    expect(cached()[0]).toMatchObject({ name: "Andi", score: 95 });
  });
  it("keeps both concurrent imports and ranks them after confirmation", async () => {
    const hook = await mount();
    await act(async () => {
      await Promise.all([hook.result.current.appendStudents([row("Budi", 80)]), hook.result.current.appendStudents([row("Citra", 70)])]);
    });
    expect(hook.result.current.students.map(s => [s.id, s.rank])).toEqual([["Andi", 1], ["Budi", 2], ["Citra", 3]]);
    expect(cached()).toHaveLength(3);
  });
  it("restores confirmed state after failed update/delete/clear/replace/add operations", async () => {
    for (const method of ["saveStudents", "updateStudent", "deleteStudent", "clearStudents", "replaceStudents"] as const) vi.mocked(api[method]).mockRejectedValue(new Error("offline"));
    const hook = await mount();
    const actions = [() => hook.result.current.updateField("Andi", { score: 10 }), () => hook.result.current.removeRow("Andi"),
      () => hook.result.current.clear(), () => hook.result.current.replaceAll([row("Replacement")]), () => hook.result.current.addRow()];
    for (const action of actions) {
      await act(async () => { expect(await action()).toBe(false); });
      expect(hook.result.current.students[0]).toMatchObject({ id: "Andi", score: 90 });
      expect(cached().map(s => s.id)).toEqual(["Andi"]);
    }
  });
  it("replaces through one atomic API contract without a client clear-then-save", async () => {
    const hook = await mount();
    await act(async () => { expect(await hook.result.current.replaceAll([row("Replacement")])).toBe(true); });
    expect(api.replaceStudents).toHaveBeenCalledTimes(1);
    expect(api.clearStudents).not.toHaveBeenCalled(); expect(api.saveStudents).not.toHaveBeenCalled();
    expect(cached().map(s => s.id)).toEqual(["Replacement"]);
  });
  it("denies every mutation for a student account", async () => {
    auth.canManageData = false;
    const hook = await mount();
    await act(async () => {
      expect(await hook.result.current.appendStudents([row("Budi")])).toBe(false);
      expect(await hook.result.current.updateField("Andi", { score: 1 })).toBe(false);
      expect(await hook.result.current.removeRow("Andi")).toBe(false);
      expect(await hook.result.current.replaceAll([])).toBe(false);
      expect(await hook.result.current.addRow()).toBe(false);
      expect(await hook.result.current.clear()).toBe(false);
    });
    for (const method of [api.saveStudents, api.updateStudent, api.deleteStudent, api.replaceStudents, api.clearStudents]) expect(method).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledTimes(6); expect(cached()).toHaveLength(1);
  });
  it("keeps demo edits local with no backend session", async () => {
    localStorage.removeItem("rankify_token");
    const hook = await mount();
    await act(async () => { expect(await hook.result.current.appendStudents([row("Budi")])).toBe(true); });
    expect(api.listStudents).not.toHaveBeenCalled(); expect(api.saveStudents).not.toHaveBeenCalled();
    expect(cached()).toHaveLength(2);
  });
  it("does not commit an old teacher write after the account becomes read-only", async () => {
    let resolve!: (value: { ok: true }) => void;
    vi.mocked(api.saveStudents).mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const hook = await mount(); let pending!: Promise<boolean>;
    act(() => { pending = hook.result.current.appendStudents([row("Budi")]); });
    await waitFor(() => expect(api.saveStudents).toHaveBeenCalledTimes(1));
    auth.canManageData = false; auth.user = { email: "siswa@mock.test" };
    hook.rerender();
    await act(async () => { resolve({ ok: true }); expect(await pending).toBe(false); });
    expect(cached().map(s => s.id)).toEqual(["Andi"]);
  });
});
