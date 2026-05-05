import { useCallback, useMemo, useState } from "react";
import { recompute, uid, validateStudent } from "@/lib/ranking";
import type { Student } from "@/lib/types";

/**
 * useStudents — single source of truth for the student list.
 * Every mutation re-runs validation + dense ranking so the UI stays correct.
 */
export function useStudents(initial: Student[] = []) {
  const [students, setStudents] = useState<Student[]>(() => recompute(initial));

  /** Replace the whole list (rarely used; prefer appendStudents) */
  const replaceAll = useCallback((next: Student[]) => {
    setStudents(recompute(next));
  }, []);

  /**
   * Append new rows to the existing list (default behaviour for OCR / camera).
   * Existing data is preserved; ranking is recomputed across all rows.
   */
  const appendStudents = useCallback((incoming: Student[]) => {
    setStudents((prev) => recompute([...prev, ...incoming]));
  }, []);

  /** Update a single field on a row */
  const updateField = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<
          Student,
          "name" | "score" | "className" | "meeting" | "model" | "pretest" | "posttest" | "kind"
        >
      >,
    ) => {
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

  /** Add an empty row for manual entry, optionally pre-filled with a class */
  const addRow = useCallback((className?: string) => {
    setStudents((prev) =>
      recompute([
        ...prev,
        {
          id: uid(),
          name: "",
          score: NaN,
          className,
          rank: 0,
          isValid: false,
        },
      ]),
    );
  }, []);

  /** Reset everything */
  const clear = useCallback(() => setStudents([]), []);

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
