import { useCallback, useEffect, useState } from "react";
import { Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type QuarantinedRow = {
  id: string;
  class_id: string | null;
  period_id: string | null;
  row_data: { name?: string; nisn?: string; className?: string; score?: number; kind?: "pretest" | "meeting" | "posttest"; meeting?: number };
  reason: string;
  created_at: string;
};
type StudentChoice = { id: string; full_name: string; nisn: string | null };

export function QuarantineReview({ onResolved }: { onResolved: () => Promise<void> }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<QuarantinedRow[]>([]);
  const [choices, setChoices] = useState<Record<string, StudentChoice[]>>({});
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("import_quarantine")
      .select("id,class_id,period_id,row_data,reason,created_at")
      .is("resolved_at", null).order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    const pending = (data ?? []) as QuarantinedRow[];
    setRows(pending);
    const fetched: Record<string, StudentChoice[]> = {};
    const preselected: Record<string, string> = {};
    await Promise.all(pending.map(async (row) => {
      if (!row.class_id) return;
      const { data: memberships, error: membershipError } = await supabase.from("class_memberships")
        .select("profile_id").eq("class_id", row.class_id).eq("member_role", "siswa");
      if (membershipError || !memberships?.length) return;
      const { data: profiles, error: profilesError } = await supabase.from("profiles")
        .select("id,full_name,nisn").in("id", memberships.map((membership) => membership.profile_id)).order("full_name");
      if (profilesError) return;
      const roster = (profiles ?? []) as StudentChoice[];
      fetched[row.id] = roster;
      const match = row.row_data.nisn
        ? roster.find((profile) => profile.nisn === row.row_data.nisn)
        : roster.find((profile) => profile.full_name.trim().toLocaleLowerCase() === row.row_data.name?.trim().toLocaleLowerCase());
      if (match) preselected[row.id] = match.id;
    }));
    setChoices(fetched);
    setSelected((current) => ({ ...preselected, ...current }));
  }, []);

  useEffect(() => { void load(); }, [load]);

  const resolve = async (row: QuarantinedRow) => {
    if (!user || !row.class_id || !row.period_id) return toast.error("Kelas atau periode asal tidak ditemukan.");
    const studentId = selected[row.id];
    if (!studentId) return toast.error("Pilih siswa pada roster kelas untuk mencocokkan baris ini.");
    const score = Number(row.row_data.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) return toast.error("Nilai baris tidak valid dan perlu diperbaiki dari sumbernya.");
    setBusyId(row.id);
    const kind = row.row_data.kind ?? "meeting";
    const { error: scoreError } = await supabase.from("student_scores").upsert({
      school_id: user.schoolId,
      class_id: row.class_id,
      period_id: row.period_id,
      student_id: studentId,
      kind,
      meeting: kind === "meeting" ? Math.max(1, Number(row.row_data.meeting) || 1) : null,
      score,
      source: "import",
    }, { onConflict: "student_id,period_id,kind,meeting" });
    if (scoreError) {
      setBusyId("");
      return toast.error(scoreError.message);
    }
    const { error } = await supabase.from("import_quarantine").update({ resolved_at: new Date().toISOString(), resolved_by: user.id }).eq("id", row.id);
    setBusyId("");
    if (error) return toast.error(error.message);
    toast.success(`Baris ${row.row_data.name ?? "impor"} diverifikasi dan dimasukkan ke periode penelitian.`);
    await load();
    await onResolved();
  };

  return <section className="space-y-4 rounded-2xl border border-warning/30 bg-warning/5 p-5">
    <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">Karantina impor ({rows.length})</h3><p className="text-xs text-muted-foreground">Baris ini belum masuk peringkat atau analisis. Cocokkan dengan roster kelas, lalu verifikasi.</p></div><Button type="button" variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="h-4 w-4" />Muat ulang</Button></div>
    {rows.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada baris karantina yang menunggu verifikasi.</p> : <div className="space-y-3">{rows.map((row) => <article key={row.id} className="grid gap-3 rounded-xl border border-border bg-background/70 p-4 md:grid-cols-[1fr_1fr_auto] md:items-center"><div className="min-w-0"><p className="truncate font-medium">{row.row_data.name || "Nama tidak tersedia"}{row.row_data.nisn ? ` · NISN ${row.row_data.nisn}` : ""}</p><p className="text-xs text-muted-foreground">{row.row_data.className || "Kelas tidak diketahui"} · {row.row_data.kind === "meeting" ? `Pertemuan ${row.row_data.meeting ?? 1}` : row.row_data.kind ?? "Asesmen"} · nilai {row.row_data.score ?? "-"}</p><p className="mt-1 text-xs text-warning">{row.reason}</p></div><select aria-label={`Cocokkan ${row.row_data.name ?? "baris impor"}`} className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={selected[row.id] ?? ""} onChange={(event) => setSelected((current) => ({ ...current, [row.id]: event.target.value }))}><option value="">Pilih siswa dari roster kelas</option>{(choices[row.id] ?? []).map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name}{profile.nisn ? ` · ${profile.nisn}` : ""}</option>)}</select><Button type="button" size="sm" onClick={() => void resolve(row)} disabled={busyId === row.id || !selected[row.id]}><Check className="h-4 w-4" />{busyId === row.id ? "Menyimpan..." : "Verifikasi"}</Button></article>)}</div>}
  </section>;
}
