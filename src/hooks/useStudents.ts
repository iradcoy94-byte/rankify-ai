import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api, getToken } from "@/services/api";
import { recompute, uid, validateStudent } from "@/lib/ranking";
import type { Student } from "@/lib/types";

const hasBackendSession = () => Boolean(getToken());
const LOCAL_STUDENTS_KEY = "rankify.students.shared.v1";

function normalizeStoredStudent(row: Student): Student {
  return {
    ...row,
    score:
      row.score === null || row.score === undefined ? NaN : Number(row.score),
    meeting:
      row.meeting === null || row.meeting === undefined
        ? undefined
        : Number(row.meeting),
    pretest:
      row.pretest === null || row.pretest === undefined
        ? undefined
        : Number(row.pretest),
    posttest:
      row.posttest === null || row.posttest === undefined
        ? undefined
        : Number(row.posttest),
  };
}

function loadLocalStudents(): Student[] {
  try {
    const raw = localStorage.getItem(LOCAL_STUDENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return recompute(parsed.map(normalizeStoredStudent));
  } catch {
    return [];
  }
}

function saveLocalStudents(rows: Student[]) {
  try {
    localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(rows));
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

/**
 * useStudents — single source of truth for the student list.
 * Every mutation re-runs validation + dense ranking so the UI stays correct.
 */
export function useStudents(initial: Student[] = []) {
  const { canManageData, user } = useAuth();
  const [students, setStudents] = useState<Student[]>(() => {
    const localRows = loadLocalStudents();
    return localRows.length > 0 ? localRows : recompute(initial);
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const studentsRef = useRef(students);

  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  const commitStudents = useCallback((next: Student[]) => {
    const recomputed = recompute(next);
    studentsRef.current = recomputed;
    setStudents(recomputed);
    saveLocalStudents(recomputed);
    return recomputed;
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!hasBackendSession()) {
      commitStudents(loadLocalStudents());
      return;
    }

    let active = true;
    setIsSyncing(true);
    api
      .listStudents()
      .then((rows) => {
        if (active) commitStudents(rows);
      })
      .catch((error) => {
        if (active) commitStudents(loadLocalStudents());
        toast.error(error instanceof Error ? error.message : "Gagal memuat data siswa");
      })
      .finally(() => {
        if (active) setIsSyncing(false);
      });
    return () => {
      active = false;
    };
  }, [user, commitStudents]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOCAL_STUDENTS_KEY && !hasBackendSession()) {
        commitStudents(loadLocalStudents());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [commitStudents]);

  const denyReadonly = useCallback(() => {
    toast.warning("Akun peserta didik hanya bisa melihat data dan memakai Chatbot AI.");
  }, []);

  /** Replace the whole list (rarely used; prefer appendStudents) */
  const replaceAll = useCallback(async (next: Student[]) => {
    if (!canManageData) return denyReadonly();
    const recomputed = commitStudents(next);
    if (!hasBackendSession()) return;
    try {
      await api.clearStudents();
      await api.saveStudents(recomputed);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan data");
    }
  }, [canManageData, commitStudents, denyReadonly]);

  /**
   * Append new rows to the existing list (default behaviour for OCR / camera).
   * Existing data is preserved; ranking is recomputed across all rows.
   */
  const appendStudents = useCallback(async (incoming: Student[]) => {
    if (!canManageData) return denyReadonly();
    const rows = recompute(incoming);
    commitStudents([...studentsRef.current, ...rows]);
    if (!hasBackendSession()) return;
    try {
      await api.saveStudents(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan data siswa");
    }
  }, [canManageData, commitStudents, denyReadonly]);

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
      commitStudents(studentsRef.current.map((s) => (s.id === id ? updated : s)));
      if (!hasBackendSession()) return;
      try {
        await api.updateStudent(id, updated);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal memperbarui data");
      }
    },
    [canManageData, commitStudents, denyReadonly],
  );

  /** Remove a row */
  const removeRow = useCallback(async (id: string) => {
    if (!canManageData) return denyReadonly();
    commitStudents(studentsRef.current.filter((s) => s.id !== id));
    if (!hasBackendSession()) return;
    try {
      await api.deleteStudent(id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus data");
    }
  }, [canManageData, commitStudents, denyReadonly]);

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
    commitStudents([...studentsRef.current, row]);
    if (!hasBackendSession()) return;
    try {
      await api.saveStudents([row]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menambah baris");
    }
  }, [canManageData, commitStudents, denyReadonly]);

  /** Reset everything */
  const clear = useCallback(async () => {
    if (!canManageData) return denyReadonly();
    commitStudents([]);
    if (!hasBackendSession()) return;
    try {
      await api.clearStudents();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal reset data");
    }
  }, [canManageData, commitStudents, denyReadonly]);

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
