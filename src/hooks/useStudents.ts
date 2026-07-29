import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api, getToken } from "@/services/api";
import { recompute, uid, validateStudent } from "@/lib/ranking";
import type { Student } from "@/lib/types";

const hasBackendSession = () => Boolean(getToken());

/**
 * useStudents — single source of truth for the student list.
 * Every mutation re-runs validation + dense ranking so the UI stays correct.
 */
export function useStudents(initial: Student[] = []) {
  const { canManageData, user } = useAuth();
  const [students, setStudents] = useState<Student[]>(() => recompute(initial));
  const [isSyncing, setIsSyncing] = useState(false);
  const studentsRef = useRef(students);
  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  useEffect(() => {
    if (!user) return;
    if (!hasBackendSession()) return;
    let active = true;
    setIsSyncing(true);
    api
      .listStudents()
      .then((rows) => {
        if (active) setStudents(recompute(rows));
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Gagal memuat data siswa");
      })
      .finally(() => {
        if (active) setIsSyncing(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const denyReadonly = useCallback(() => {
    toast.warning("Akun peserta didik hanya bisa melihat data dan memakai Chatbot AI.");
  }, []);

  /** Replace the whole list (rarely used; prefer appendStudents) */
  const replaceAll = useCallback(async (next: Student[]) => {
    if (!canManageData) return denyReadonly();
    const recomputed = recompute(next);
    setStudents(recompute(next));
    if (!hasBackendSession()) return;
    try {
      await api.clearStudents();
      await api.saveStudents(recomputed);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan data");
    }
  }, [canManageData, denyReadonly]);

  /**
   * Append new rows to the existing list (default behaviour for OCR / camera).
   * Existing data is preserved; ranking is recomputed across all rows.
   */
  const appendStudents = useCallback(async (incoming: Student[]) => {
    if (!canManageData) return denyReadonly();
    const rows = recompute(incoming);
    setStudents((prev) => recompute([...prev, ...rows]));
    if (!hasBackendSession()) return;
    try {
      await api.saveStudents(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan data siswa");
    }
  }, [canManageData, denyReadonly]);

  /** Update a single field on a row */
  const updateField = useCallback(
    async (
      id: string,
      patch: Partial<
        Pick<
          Student,
          "name" | "score" | "className" | "meeting" | "model" | "pretest" | "posttest" | "kind"
        >
      >,
    ) => {
      if (!canManageData) return denyReadonly();
      const current = studentsRef.current.find((s) => s.id === id);
      if (!current) return;
      const updated = validateStudent({ ...current, ...patch });
      setStudents((prev) => recompute(prev.map((s) => (s.id === id ? updated : s))));
      if (!hasBackendSession()) return;
      try {
        await api.updateStudent(id, updated);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal memperbarui data");
      }
    },
    [canManageData, denyReadonly],
  );

  /** Remove a row */
  const removeRow = useCallback(async (id: string) => {
    if (!canManageData) return denyReadonly();
    setStudents((prev) => recompute(prev.filter((s) => s.id !== id)));
    if (!hasBackendSession()) return;
    try {
      await api.deleteStudent(id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus data");
    }
  }, [canManageData, denyReadonly]);

  /** Add an empty row for manual entry, optionally pre-filled with a class */
  const addRow = useCallback(async (className?: string) => {
    if (!canManageData) return denyReadonly();
    const row: Student = {
      id: uid(),
      name: "",
      score: NaN,
      className,
      rank: 0,
      isValid: false,
    };
    setStudents((prev) => recompute([...prev, row]));
    if (!hasBackendSession()) return;
    try {
      await api.saveStudents([row]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menambah baris");
    }
  }, [canManageData, denyReadonly]);

  /** Reset everything */
  const clear = useCallback(async () => {
    if (!canManageData) return denyReadonly();
    setStudents([]);
    if (!hasBackendSession()) return;
    try {
      await api.clearStudents();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal reset data");
    }
  }, [canManageData, denyReadonly]);

  /** Quick stats for header chips (computed across ALL students) */
  const stats = useMemo(() => {
    const valid = students.filter((s) => s.isValid);
    const avg =
      valid.length === 0
        ? 0
        : valid.reduce((sum, s) => sum + s.score, 0) / valid.length;
    return {
      total: students.length,
      valid: valid.length,
      invalid: students.length - valid.length,
      avg: Math.round(avg * 10) / 10,
    };
  }, [students]);

  /** Distinct class labels present in the data, sorted alphabetically. */
  const classes = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      const c = (s.className ?? "").trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort();
  }, [students]);

  return {
    students,
    isSyncing,
    canManageData,
    stats,
    classes,
    replaceAll,
    appendStudents,
    updateField,
    removeRow,
    addRow,
    clear,
  };
}
