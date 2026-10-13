import { useEffect, useMemo, useState } from "react";
import { Medal, Trophy } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Student } from "@/lib/types";

type RankRow = { full_name: string; dense_rank: number; is_me: boolean };

export function StudentClassRanking({ students }: { students: Student[] }) {
  const { session } = useAuth();
  const [selectedId, setSelectedId] = useState("");
  const [ranking, setRanking] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(false);
  const ownRows = useMemo(() => students.filter((row) => row.studentId === session?.id && row.periodId && row.classId), [students, session?.id]);
  const selected = useMemo(() => ownRows.find((row) => row.id === selectedId) ?? ownRows[ownRows.length - 1], [ownRows, selectedId]);

  useEffect(() => {
    if (!selected) {
      setRanking([]);
      return;
    }
    let active = true;
    setLoading(true);
    void supabase.rpc("get_my_class_ranking", {
      p_period_id: selected.periodId,
      p_kind: selected.kind ?? "meeting",
      p_meeting: selected.kind === "meeting" ? selected.meeting ?? 1 : null,
    }).then(({ data, error }) => {
      if (!active) return;
      if (error) setRanking([]);
      else setRanking((data ?? []) as RankRow[]);
      setLoading(false);
    });
    return () => { active = false; };
  }, [selected]);

  if (!selected) return <section className="container mt-8"><EmptyState /><p className="mt-3 text-center text-sm text-muted-foreground">Belum ada nilai yang terhubung ke akun Anda.</p></section>;
  const assessment = selected.kind === "pretest" ? "Pre-test" : selected.kind === "posttest" ? "Post-test" : `Pertemuan ${selected.meeting ?? 1}`;
  const ownRank = ranking.find((row) => row.is_me)?.dense_rank;

  return <section className="container mt-8 max-w-4xl space-y-6 pb-12">
    <div><span className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs text-primary"><Trophy className="h-3.5 w-3.5" />Peringkat kelas</span><h2 className="text-3xl font-bold">Hasil belajar dan posisi kelas</h2><p className="mt-2 text-sm text-muted-foreground">Nilai pribadi ditampilkan kepada Anda. Tabel kelas hanya menampilkan nama dan posisi, tanpa nilai teman.</p></div>
    <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-border bg-card/60 p-4"><p className="text-xs text-muted-foreground">Kelas</p><p className="mt-1 font-semibold">{selected.className}</p></div><div className="rounded-2xl border border-border bg-card/60 p-4"><p className="text-xs text-muted-foreground">Asesmen</p><p className="mt-1 font-semibold">{assessment}</p></div><div className="rounded-2xl border border-primary/30 bg-primary/5 p-4"><p className="text-xs text-muted-foreground">Nilai Anda</p><p className="mt-1 text-2xl font-bold text-primary">{selected.score}</p></div></div>
    <div className="overflow-hidden rounded-2xl border border-border bg-card/50">
      <div className="flex items-center justify-between border-b border-border p-4"><div><h3 className="font-semibold">Posisi di kelas</h3><p className="text-xs text-muted-foreground">{ownRank ? `Posisi Anda: ${ownRank}` : "Peringkat belum tersedia"}</p></div><Medal className="h-5 w-5 text-primary" /></div>
      {loading ? <p className="p-5 text-sm text-muted-foreground">Memuat peringkat…</p> : ranking.length === 0 ? <p className="p-5 text-sm text-muted-foreground">Belum ada data peringkat untuk asesmen ini.</p> : <ol className="divide-y divide-border">{ranking.map((row, index) => <li key={`${row.dense_rank}-${row.full_name}-${index}`} className={`flex items-center gap-3 px-4 py-3 text-sm ${row.is_me ? "bg-primary/5 font-semibold" : ""}`}><span className="grid h-8 w-8 place-items-center rounded-full bg-secondary font-mono">{row.dense_rank}</span><span>{row.full_name}{row.is_me ? " (Anda)" : ""}</span><span className="ml-auto text-xs text-muted-foreground">Peringkat {row.dense_rank}</span></li>)}</ol>}
    </div>
  </section>;
}
