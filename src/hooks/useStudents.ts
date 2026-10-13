import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { assertSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { recompute, uid, validateStudent } from "@/lib/ranking";
import type { Student } from "@/lib/types";

type DbScore = {
  id: string;
  student_id: string;
  class_id: string;
  period_id: string;
  kind: Student["kind"];
  meeting: number | null;
  score: number;
  profile: { full_name: string; nisn: string | null } | { full_name: string; nisn: string | null }[];
  class: { name: string; learning_model: string | null; kkm: number } | { name: string; learning_model: string | null; kkm: number }[];
};

const one = <T,>(value: T | T[] | null): T | null => Array.isArray(value) ? value[0] ?? null : value;

function fromDb(row: DbScore): Student {
  const profile = one(row.profile);
  const klass = one(row.class);
  return validateStudent({
    id: row.id,
    studentId: row.student_id,
    classId: row.class_id,
    periodId: row.period_id,
    nisn: profile?.nisn ?? undefined,
    name: profile?.full_name ?? "",
    score: Number(row.score),
    className: klass?.name,
    model: (klass?.learning_model ?? undefined) as Student["model"],
    kind: row.kind ?? "meeting",
    meeting: row.meeting ?? undefined,
    rank: 0,
    isValid: true,
  });
}

function toDb(row: Student, schoolId: string) {
  return {
    id: row.id,
    school_id: schoolId,
    class_id: row.classId,
    period_id: row.periodId,
    student_id: row.studentId,
    kind: row.kind ?? "meeting",
    meeting: row.kind === "meeting" ? row.meeting ?? 1 : null,
    score: row.score,
    source: "import",
  };
}

export function useStudents(initial: Student[] = []) {
  const { canManageData, user } = useAuth();
  const [students, setStudents] = useState<Student[]>(initial);
  const [classes, setClasses] = useState<string[]>([]);
  const [classKkm, setClassKkm] = useState<Record<string, number>>({});
  const [activeMetrics, setActiveMetrics] = useState<Record<string, boolean>>({ prepost: true, nGain: true, modelComparison: true });
  const [isSyncing, setIsSyncing] = useState(false);
  const [persistedIds, setPersistedIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!user) {
      setStudents([]);
      setClasses([]);
      setPersistedIds(new Set());
      return;
    }
    setIsSyncing(true);
    try {
      assertSupabaseConfigured();
      const [{ data: period, error: periodError }, { data: classRows, error: classError }] = await Promise.all([
        supabase.from("research_periods").select("id,metrics").eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("classes").select("id,name,kkm,learning_model"),
      ]);
      if (periodError) throw periodError;
      if (classError) throw classError;
      const { data: scoreRows, error: scoreError } = period
        ? await supabase.from("student_scores").select(`id, student_id, class_id, period_id, kind, meeting, score,
          profile:profiles!student_scores_student_id_fkey(full_name, nisn),
          class:classes!student_scores_class_id_fkey(name, learning_model, kkm)`).eq("period_id", period.id).order("created_at")
        : { data: [], error: null };
      if (scoreError) throw scoreError;
      setActiveMetrics({ prepost: true, nGain: true, modelComparison: true, ...((period?.metrics ?? {}) as Record<string, boolean>) });
      const mapped = ((scoreRows ?? []) as unknown as DbScore[]).map(fromDb);
      setStudents(recompute(mapped));
      setPersistedIds(new Set(mapped.map((row) => row.id)));
      setClasses((classRows ?? []).map((row: { name: string }) => row.name).sort((a: string, b: string) => a.localeCompare(b)));
      setClassKkm(Object.fromEntries((classRows ?? []).map((row: { name: string; kkm: number }) => [row.name, Number(row.kkm)])));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat data sekolah dari Supabase.");
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const resolveClass = useCallback(async (row: Student) => {
    if (row.classId) return { id: row.classId, name: row.className ?? "" };
    if (!row.className) throw new Error(`Kelas belum dipilih untuk ${row.name}.`);
    const { data, error } = await supabase.from("classes").select("id,name").ilike("name", row.className.trim()).limit(2);
    if (error) throw error;
    if (data?.length === 1) return data[0] as { id: string; name: string };
    const normalized = row.className.trim().replace(/^kelas\s+/i, "").toLocaleLowerCase();
    const { data: allClasses, error: listError } = await supabase.from("classes").select("id,name");
    if (listError) throw listError;
    const aliases = (allClasses ?? []).filter((klass: { name: string }) => klass.name.trim().replace(/^kelas\s+/i, "").toLocaleLowerCase() === normalized);
    if (aliases.length !== 1) throw new Error(`Kelas “${row.className}” tidak ditemukan atau namanya tidak unik.`);
    return aliases[0] as { id: string; name: string };
  }, []);

  const resolvePeriod = useCallback(async (row: Student) => {
    if (row.periodId) return row.periodId;
    const { data, error } = await supabase.from("research_periods").select("id").eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Periode penelitian aktif belum dibuat di Supabase.");
    return data.id as string;
  }, []);

  const resolveStudent = useCallback(async (row: Student, classId: string, periodId: string) => {
    let query = supabase.from("profiles").select("id,full_name,nisn");
    if (row.nisn?.trim()) query = query.eq("nisn", row.nisn.trim());
    else query = query.ilike("full_name", row.name.trim());
    const { data, error } = await query.limit(10);
    if (error) throw error;
    const candidates = (data ?? []) as { id: string; full_name: string; nisn: string | null }[];
    const exact = candidates.filter((candidate) => candidate.full_name.trim().toLocaleLowerCase() === row.name.trim().toLocaleLowerCase());
    const eligible = row.nisn?.trim() ? candidates : exact;
    const memberships = eligible.length
      ? await supabase.from("class_memberships").select("profile_id").eq("class_id", classId).eq("member_role", "siswa").in("profile_id", eligible.map((candidate) => candidate.id))
      : { data: [], error: null };
    if (memberships.error) throw memberships.error;
    const eligibleIds = new Set((memberships.data ?? []).map((membership: { profile_id: string }) => membership.profile_id));
    const matches = eligible.filter((candidate) => eligibleIds.has(candidate.id));
    if (matches.length === 1) return matches[0];
    const reason = matches.length > 1 ? "Pencocokan siswa ambigu" : row.nisn ? "NISN tidak ditemukan di roster kelas" : "Nama tidak cocok dengan roster kelas";
    const { error: quarantineError } = await supabase.from("import_quarantine").insert({
      school_id: user?.schoolId,
      class_id: classId,
      period_id: periodId,
      created_by: user?.id,
      source: "import",
      row_data: row,
      reason,
    });
    if (quarantineError) throw quarantineError;
    return null;
  }, [user]);

  const appendStudents = useCallback(async (incoming: Student[]) => {
    if (!canManageData) return toast.warning("Akun siswa hanya dapat melihat data.");
    if (!user) return;
    try {
      const prepared: Student[] = [];
      for (const draft of incoming) {
        const row = validateStudent(draft);
        if (!row.isValid) continue;
        const klass = await resolveClass(row);
        const periodId = await resolvePeriod(row);
        const profile = await resolveStudent(row, klass.id, periodId);
        if (!profile) continue;
        prepared.push({
          ...row,
          // Legacy PHP/localStorage IDs may not be UUIDs accepted by Postgres.
          id: crypto.randomUUID(),
          kind: row.kind ?? "meeting",
          studentId: profile.id,
          nisn: profile.nisn ?? undefined,
          classId: klass.id,
          className: klass.name,
          periodId,
        });
      }
      if (prepared.length === 0) {
        await refresh();
        toast.warning("Tidak ada baris yang dapat disimpan. Baris tanpa kecocokan dimasukkan ke karantina.");
        return;
      }

      const duplicateRows: Student[] = [];
      const newRows: Student[] = [];
      const incomingKeys = new Set<string>();
      for (const row of prepared) {
        const key = `${row.studentId}:${row.periodId}:${row.kind}:${row.kind === "meeting" ? row.meeting ?? 1 : ""}`;
        if (incomingKeys.has(key)) {
          duplicateRows.push(row);
          continue;
        }
        incomingKeys.add(key);
        const filtered = row.kind === "meeting"
          ? await supabase.from("student_scores").select("id").eq("student_id", row.studentId).eq("period_id", row.periodId).eq("kind", "meeting").eq("meeting", row.meeting ?? 1).maybeSingle()
          : await supabase.from("student_scores").select("id").eq("student_id", row.studentId).eq("period_id", row.periodId).eq("kind", row.kind ?? "meeting").is("meeting", null).maybeSingle();
        if (filtered.error) throw filtered.error;
        (filtered.data ? duplicateRows : newRows).push(row);
      }
      const rowsToInsert = newRows;
      let replaceConflicts = false;
      if (duplicateRows.length > 0) {
        const sample = duplicateRows.slice(0, 5).map((row) => `${row.name} · ${row.kind === "meeting" ? `pertemuan ${row.meeting}` : row.kind}`).join("\n");
        replaceConflicts = window.confirm(`${duplicateRows.length} nilai sudah tersedia untuk siswa dan asesmen yang sama. Periksa nama/asesmen di bawah ini sebelum memilih.\n\n${sample}${duplicateRows.length > 5 ? "\n…" : ""}\n\nOK: perbarui nilai tersebut. Batal: lewati baris duplikat.`);
      }
      if (rowsToInsert.length > 0) {
        const { error } = await supabase.from("student_scores").insert(rowsToInsert.map((row) => toDb(row, user.schoolId)));
        if (error) throw error;
      }
      if (replaceConflicts) {
        const payload = [...new Map(duplicateRows.map((row) => [
          `${row.studentId}:${row.periodId}:${row.kind}:${row.kind === "meeting" ? row.meeting ?? 1 : ""}`,
          row,
        ])).values()].map((row) => toDb(row, user.schoolId));
        const { error } = await supabase.from("student_scores").upsert(payload, { onConflict: "student_id,period_id,kind,meeting" });
        if (error) throw error;
      }
      await refresh();
      const updatedCount = duplicateRows.length > 0 && replaceConflicts ? new Set(duplicateRows.map((row) => `${row.studentId}:${row.periodId}:${row.kind}:${row.kind === "meeting" ? row.meeting ?? 1 : ""}`)).size : 0;
      toast.success(`${newRows.length + updatedCount} nilai tersimpan; ${duplicateRows.length - updatedCount} konflik dilewati; ${incoming.length - prepared.length} baris tidak cocok atau tidak valid.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan data nilai.");
    }
  }, [canManageData, user, resolveClass, resolvePeriod, resolveStudent, refresh]);

  const updateField = useCallback(async (id: string, patch: Partial<Pick<Student, "name" | "score" | "className" | "meeting" | "model" | "pretest" | "posttest" | "kind">>) => {
    if (!canManageData) return;
    const current = students.find((row) => row.id === id);
    if (!current) return;
    try {
      if (patch.name && current.studentId) {
        const { error } = await supabase.from("profiles").update({ full_name: patch.name.trim() }).eq("id", current.studentId);
        if (error) throw error;
      }
      const next = validateStudent({ ...current, ...patch });
      if (!next.isValid) {
        setStudents((rows) => recompute(rows.map((row) => row.id === id ? next : row)));
        return;
      }
      if (!persistedIds.has(id)) {
        const klass = await resolveClass(next);
        const periodId = await resolvePeriod(next);
        const profile = await resolveStudent(next, klass.id, periodId);
        if (!profile) return toast.warning("Siswa tidak cocok dengan roster kelas; baris masuk karantina.");
        const ready = { ...next, classId: klass.id, className: klass.name, periodId, studentId: profile.id, nisn: profile.nisn ?? undefined };
        const { error } = await supabase.from("student_scores").insert(toDb(ready, user!.schoolId));
        if (error) throw error;
        await refresh();
        return;
      }
      const { error } = await supabase.from("student_scores").update({
        score: next.score,
        kind: next.kind ?? "meeting",
        meeting: next.kind === "meeting" ? next.meeting ?? 1 : null,
      }).eq("id", id);
      if (error) throw error;
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui nilai.");
    }
  }, [canManageData, students, persistedIds, resolveClass, resolvePeriod, resolveStudent, user, refresh]);

  const removeRow = useCallback(async (id: string) => {
    if (!canManageData) return;
    const { error } = await supabase.from("student_scores").delete().eq("id", id);
    if (error) toast.error(error.message);
    else await refresh();
  }, [canManageData, refresh]);

  const addRow = useCallback(async (className?: string) => {
    if (!canManageData) return;
    setStudents((rows) => [...rows, validateStudent({
      id: uid(), name: "", score: Number.NaN, className, rank: 0, isValid: false,
    })]);
    toast.info("Baris manual lokal ditambahkan. Cocokkan siswa melalui NISN saat menyimpan nilai.");
  }, [canManageData]);

  const clear = useCallback(async () => {
    if (!canManageData) return;
    if (!window.confirm("Hapus semua nilai yang dapat Anda kelola? Tindakan ini tidak dapat dibatalkan.")) return;
    const { error } = await supabase.from("student_scores").delete().not("id", "is", null);
    if (error) toast.error(error.message);
    else await refresh();
  }, [canManageData, refresh]);

  const updateKkm = useCallback(async (className: string, value: number) => {
    if (!canManageData || !Number.isFinite(value) || value < 0 || value > 100) return;
    const { data, error: findError } = await supabase.from("classes").select("id").ilike("name", className).single();
    if (findError || !data) return toast.error(findError?.message ?? "Kelas tidak ditemukan.");
    const { error } = await supabase.from("classes").update({ kkm: value }).eq("id", data.id);
    if (error) toast.error(error.message);
    else setClassKkm((current) => ({ ...current, [className]: value }));
  }, [canManageData]);

  const stats = useMemo(() => {
    const valid = students.filter((row) => row.isValid);
    const avg = valid.length ? valid.reduce((sum, row) => sum + row.score, 0) / valid.length : 0;
    return { total: students.length, valid: valid.length, invalid: students.length - valid.length, avg: Math.round(avg * 10) / 10 };
  }, [students]);

  return {
    students,
    isSyncing,
    canManageData,
    stats,
    classes,
    classKkm,
    activeMetrics,
    updateKkm,
    persistedIds,
    replaceAll: appendStudents,
    appendStudents,
    updateField,
    removeRow,
    addRow,
    clear,
    refresh,
  };
}
