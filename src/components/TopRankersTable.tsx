import { useMemo } from "react";
import { Trophy, Medal, Award } from "lucide-react";
import { recompute } from "@/lib/ranking";
import type { Student } from "@/lib/types";

interface TopRankersTableProps {
  students: Student[];
  /** Optional title override */
  title?: string;
  subtitle?: string;
}

/**
 * Aggregates dense ranks per pertemuan (within the provided scope) and
 * surfaces the top-3 students with the most rank-1 finishes overall.
 * Tiebreakers: more rank-1 → more rank-2 → more rank-3 → higher total score.
 */
export function TopRankersTable({
  students,
  title = "Siswa Teratas (Akumulasi Pertemuan)",
  subtitle = "Top 3 siswa dengan total peringkat 1 terbanyak di seluruh pertemuan",
}: TopRankersTableProps) {
  const top = useMemo(() => computeTopRankers(students), [students]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-gradient-card shadow-card-soft">
      <div className="border-b border-border px-5 py-4">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-foreground/70">
            <tr>
              <th className="w-16 px-3 py-3">Posisi</th>
              <th className="px-3 py-3">Nama</th>
              <th className="w-28 px-3 py-3 text-center">Juara 1</th>
              <th className="w-28 px-3 py-3 text-center">Juara 2</th>
              <th className="w-28 px-3 py-3 text-center">Juara 3</th>
              <th className="w-32 px-3 py-3 text-right">Rata-rata Nilai</th>
            </tr>
          </thead>
          <tbody>
            {top.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center text-sm text-muted-foreground"
                >
                  Belum ada data pertemuan untuk dirangkum.
                </td>
              </tr>
            ) : (
              top.map((row, i) => (
                <tr key={row.name} className="border-t border-border/60">
                  <td className="px-3 py-3">
                    <PositionBadge pos={i + 1} />
                  </td>
                  <td className="px-3 py-3 font-medium">{row.name}</td>
                  <td className="px-3 py-3 text-center font-mono">
                    {row.firsts}
                  </td>
                  <td className="px-3 py-3 text-center font-mono">
                    {row.seconds}
                  </td>
                  <td className="px-3 py-3 text-center font-mono">
                    {row.thirds}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {row.avg.toFixed(1)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PositionBadge({ pos }: { pos: number }) {
  const cfg =
    pos === 1
      ? { icon: Trophy, cls: "bg-gradient-gold text-background shadow-gold" }
      : pos === 2
        ? { icon: Medal, cls: "bg-gradient-silver text-background" }
        : { icon: Award, cls: "bg-gradient-bronze text-background" };
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-grid h-9 w-9 place-items-center rounded-lg font-bold ${cfg.cls}`}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

interface AggRow {
  name: string;
  firsts: number;
  seconds: number;
  thirds: number;
  totalScore: number;
  count: number;
  avg: number;
}

function computeTopRankers(students: Student[]): AggRow[] {
  // Only consider meeting rows (exclude pretest/posttest).
  const meetingRows = students.filter(
    (s) => s.kind !== "pretest" && s.kind !== "posttest" && s.isValid,
  );
  if (meetingRows.length === 0) return [];

  // Group by meeting number, recompute dense ranks per group (ignoring class).
  const byMeeting = new Map<number, Student[]>();
  for (const s of meetingRows) {
    const m = s.meeting ?? 1;
    if (!byMeeting.has(m)) byMeeting.set(m, []);
    byMeeting.get(m)!.push({ ...s, className: undefined });
  }

  const agg = new Map<string, AggRow>();
  const ensure = (name: string): AggRow => {
    if (!agg.has(name))
      agg.set(name, {
        name,
        firsts: 0,
        seconds: 0,
        thirds: 0,
        totalScore: 0,
        count: 0,
        avg: 0,
      });
    return agg.get(name)!;
  };

  for (const list of byMeeting.values()) {
    const ranked = recompute(list);
    for (const s of ranked) {
      const key = s.name.trim();
      if (!key) continue;
      const row = ensure(key);
      row.totalScore += s.score;
      row.count += 1;
      if (s.rank === 1) row.firsts += 1;
      else if (s.rank === 2) row.seconds += 1;
      else if (s.rank === 3) row.thirds += 1;
    }
  }

  const rows = Array.from(agg.values()).map((r) => ({
    ...r,
    avg: r.count > 0 ? r.totalScore / r.count : 0,
  }));

  rows.sort(
    (a, b) =>
      b.firsts - a.firsts ||
      b.seconds - a.seconds ||
      b.thirds - a.thirds ||
      b.avg - a.avg,
  );

  return rows.slice(0, 3);
}
