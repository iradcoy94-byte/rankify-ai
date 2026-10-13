import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStudents } from "./useStudents";
import type { Student } from "@/lib/types";

const authState = vi.hoisted(() => ({
  canManageData: false as boolean,
  user: null as { id: string; schoolId: string; role: "guru" | "siswa" | "admin" } | null,
  warning: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({ useAuth: () => authState }));
vi.mock("sonner", () => ({ toast: { warning: authState.warning, error: authState.error, success: vi.fn(), info: vi.fn() } }));

const cachedStudent: Student = { id: "old-row", name: "Andi", score: 90, rank: 1, isValid: true };

describe("useStudents with Supabase-only persistence", () => {
  beforeEach(() => {
    authState.canManageData = false;
    authState.user = null;
    authState.warning.mockClear();
    authState.error.mockClear();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("does not hydrate application data from the retired localStorage cache", () => {
    localStorage.setItem("rankify.students.shared.v1", JSON.stringify([cachedStudent]));
    const hook = renderHook(() => useStudents());
    expect(hook.result.current.students).toEqual([]);
    expect(hook.result.current.stats.total).toBe(0);
    expect(hook.result.current.classes).toEqual([]);
  });

  it("blocks all student mutations without changing the visible score list", async () => {
    authState.user = { id: "student-1", schoolId: "school-1", role: "siswa" };
    authState.canManageData = false;
    const hook = renderHook(() => useStudents([cachedStudent]));

    await act(async () => {
      await hook.result.current.appendStudents([{ ...cachedStudent, id: "new-row" }]);
      await hook.result.current.updateField(cachedStudent.id, { score: 20 });
      await hook.result.current.removeRow(cachedStudent.id);
      await hook.result.current.addRow("Kelas 1");
      await hook.result.current.replaceAll([]);
      await hook.result.current.clear();
    });

    expect(hook.result.current.students).toEqual([cachedStudent]);
    expect(authState.warning).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem("rankify.students.shared.v1")).toBeNull();
  });
});
