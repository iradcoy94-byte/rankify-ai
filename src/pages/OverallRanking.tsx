import { CheckCircle2, AlertTriangle, Users, TrendingUp } from "lucide-react";
import { Podium } from "@/components/Podium";
import { RankingTable } from "@/components/RankingTable";
import { ScoreChart } from "@/components/ScoreChart";
import { Button } from "@/components/ui/button";
import { useStudentsCtx } from "@/context/StudentsContext";
import { StatChip } from "@/components/StatChip";
import { EmptyState } from "@/components/EmptyState";

/** Overall ranking across all classes. */
export default function OverallRanking() {
  const { students, stats, updateField, removeRow, addRow, clear } =
    useStudentsCtx();

  return (
    <section className="container mt-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-3xl font-bold">Peringkat Keseluruhan Siswa</h3>
          <p className="text-sm text-muted-foreground">
            Gabungan dari seluruh kelas — edit data di tabel untuk memperbaiki
            hasil OCR.
          </p>
        </div>
        {students.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <StatChip icon={<Users className="h-3.5 w-3.5" />} label="Siswa" value={stats.total} />
            <StatChip icon={<CheckCircle2 className="h-3.5 w-3.5 text-success" />} label="Valid" value={stats.valid} />
            <StatChip icon={<AlertTriangle className="h-3.5 w-3.5 text-destructive" />} label="Invalid" value={stats.invalid} />
            <StatChip icon={<TrendingUp className="h-3.5 w-3.5 text-primary" />} label="Rata-rata" value={stats.avg} />
            <Button variant="outline" size="sm" onClick={clear}>Reset</Button>
          </div>
        )}
      </div>

      {students.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <Podium students={students} />
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <RankingTable
              students={students}
              onUpdate={updateField}
              onRemove={removeRow}
              onAdd={() => addRow()}
            />
            <div className="rounded-2xl border border-border bg-gradient-card p-5 shadow-card-soft">
              <h4 className="mb-1 font-semibold">Distribusi Nilai</h4>
              <p className="mb-3 text-xs text-muted-foreground">
                Semua siswa valid lintas kelas
              </p>
              <ScoreChart students={students} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
