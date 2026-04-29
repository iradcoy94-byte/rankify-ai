import { useCallback, useMemo, useState } from "react";
import { recompute, uid, validateStudent } from "@/lib/ranking";
import type { Student } from "@/lib/types";

/**
 * useStudents — single source of truth for the student list.
 * Every mutation re-runs validation + dense ranking so the UI stays correct.
 */
export function useStudents(initial: Student[] = []) {
  const [students, setStudents] = useState<Student[]>(() => recompute(initial));

  /** Replace the whole list (e.g. after OCR parsing) */
  const replaceAll = useCallback((next: Student[]) => {
    setStudents(recompute(next));
  }, []);

  /** Update a single field on a row */
  const updateField = useCallback(
    (id: string, patch: Partial<Pick<Student, "name" | "score">>) => {
      setStudents((prev) =>
        recompute(
          prev.map((s) => (s.id === id ? validateStudent({ ...s, ...patch }) : s)),
        ),
      );
    },
    [],
  );

  /** Remove a row */
  const removeRow = useCallback((id: string) => {
    setStudents((prev) => recompute(prev.filter((s) => s.id !== id)));
  }, []);

  /** Add an empty row for manual entry */
  const addRow = useCallback(() => {
    setStudents((prev) =>
      recompute([
        ...prev,
        { id: uid(), name: "", score: NaN, rank: 0, isValid: false },
      ]),
    );
  }, []);

  /** Reset everything */
  const clear = useCallback(() => setStudents([]), []);

  /** Quick stats for header chips */
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

  return {
    students,
    stats,
    replaceAll,
    updateField,
    removeRow,
    addRow,
    clear,
  };
}
