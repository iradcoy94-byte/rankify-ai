import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api, getToken } from "@/services/api";
import { recompute, uid, validateStudent } from "@/lib/ranking";
import type { Student } from "@/lib/types";

const hasBackendSession = () => Boolean(getToken());
const LOCAL_STUDENTS_KEY = "rankify.students.shared.v1";
type Mutation = {
  apply: (rows: Student[]) => Student[];
  sync: (before: Student[], next: Student[]) => Promise<unknown>;
};

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

  const confirmedRef = useRef(students);
  const pendingRef = useRef<Mutation[]>([]);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const loadingRef = useRef(false);
  const authRef = useRef({ user, canManageData });
  authRef.current = { user, canManageData };

  const publish = useCallback(() => {
    const next = recompute(pendingRef.current.reduce((rows, mutation) => mutation.apply(rows), confirmedRef.current));
    setStudents(next);
    setIsSyncing(loadingRef.current || pendingRef.current.length > 0);
  }, []);

  const commitStudents = useCallback((next: Student[]) => {
    const recomputed = recompute(next);
    confirmedRef.current = recomputed;
    saveLocalStudents(recomputed);
    publish();
    return recomputed;
  }, [publish]);

  useEffect(() => {
    pendingRef.current = [];
    loadingRef.current = false;
    if (!user) { publish(); return; }
    if (!hasBackendSession()) {
      commitStudents(loadLocalStudents());
      queueRef.current = Promise.resolve();
      return;
    }
    let active = true;
    loadingRef.current = true;
    publish();
    const load = api.listStudents()
      .then(rows => { if (active) commitStudents(rows); })
      .catch(error => {
        if (active) toast.error(error instanceof Error ? error.message : "Gagal memuat data siswa");
      })
      .finally(() => {
        if (active) { loadingRef.current = false; publish(); }
      });
    queueRef.current = load;
    return () => { active = false; };
  }, [user, commitStudents, publish]);

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

  // Render queued intent immediately, but persist only server-confirmed data.
  // A failed earlier edit cannot leak into the payload of a later queued edit.
  const mutate = useCallback((mutation: Mutation): Promise<boolean> => {
    if (!canManageData) { denyReadonly(); return Promise.resolve(false); }
    const token = getToken();
    const owner = user?.email;
    const authorized = () => authRef.current.canManageData && authRef.current.user?.email === owner && getToken() === token;
    pendingRef.current.push(mutation);
    publish();
    const job = queueRef.current.then(async () => {
      try {
        if (!authorized()) return false;
        const before = confirmedRef.current;
        const next = recompute(mutation.apply(before));
        if (token) await mutation.sync(before, next);
        if (!authorized()) return false;
        commitStudents(next);
        return true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyimpan data siswa");
        return false;
      } finally {
        pendingRef.current = pendingRef.current.filter(item => item !== mutation);
        publish();
      }
    });
    queueRef.current = job.then(() => undefined);
    return job;
  }, [canManageData, user, denyReadonly, publish, commitStudents]);

  const replaceAll = useCallback((next: Student[]) => mutate({
    apply: () => recompute(next),
    sync: (_before, rows) => api.replaceStudents(rows),
  }), [mutate]);

  const appendStudents = useCallback((incoming: Student[]) => {
    const rows = recompute(incoming);
    return mutate({ apply: current => [...current, ...rows], sync: () => api.saveStudents(rows) });
  }, [mutate]);

  const updateField = useCallback((id: string, patch: Partial<Pick<Student,
    "name" | "score" | "className" | "meeting" | "model" | "pretest" | "posttest" | "kind"
  >>) => mutate({
    apply: rows => rows.map(row => row.id === id ? validateStudent({ ...row, ...patch }) : row),
    sync: async (_before, next) => {
      const row = next.find(item => item.id === id);
      if (row) await api.updateStudent(id, row);
    },
  }), [mutate]);

  const removeRow = useCallback((id: string) => mutate({
    apply: rows => rows.filter(row => row.id !== id),
    sync: () => api.deleteStudent(id),
  }), [mutate]);

  const addRow = useCallback((className?: string) => {
    const row: Student = { id: uid(), name: "", score: NaN, className, rank: 0, isValid: false };
    return mutate({ apply: rows => [...rows, row], sync: () => api.saveStudents([row]) });
  }, [mutate]);

  const clear = useCallback(() => mutate({ apply: () => [], sync: () => api.clearStudents() }), [mutate]);

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
