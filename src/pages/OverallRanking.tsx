import { useMemo } from "react";
import { CheckCircle2, AlertTriangle, Users, TrendingUp } from "lucide-react";
import { Podium } from "@/components/Podium";
import { RankingTable } from "@/components/RankingTable";
import { PrePostTable } from "@/components/PrePostTable";
import { ScoreDistributionLine } from "@/components/ScoreDistributionLine";
import { PassFailPie } from "@/components/PassFailPie";
import { MeetingProgressChart } from "@/components/MeetingProgressChart";
import { Button } from "@/components/ui/button";
import { useStudentsCtx } from "@/context/StudentsContext";
import { StatChip } from "@/components/StatChip";
import { EmptyState } from "@/components/EmptyState";
import { recompute } from "@/lib/ranking";

/** Overall ranking across all classes. */
export default function OverallRanking() {
  const { students, stats, updateField, removeRow, addRow, clear } =
    useStudentsCtx();

  // Split rows: meeting/legacy → main ranking; pretest/posttest → dedicated tables.
  const meetingRows = useMemo(
    () => recompute(students.filter((s) => s.kind !== "pretest" && s.kind !== "posttest")),
    [students],
  );

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

          <RankingTable
            students={students}
            onUpdate={updateField}
            onRemove={removeRow}
            onAdd={() => addRow()}
          />

          {/* Charts grid — fills the previously empty side area */}
          <div className="grid gap-6 lg:grid-cols-3">
            <ChartCard
              title="Perkembangan per Pertemuan"
              subtitle="Rata-rata nilai seluruh siswa di tiap pertemuan"
              className="lg:col-span-2"
            >
              <MeetingProgressChart students={students} />
            </ChartCard>
            <ChartCard
              title="Ketuntasan Belajar"
              subtitle="Tuntas vs belum tuntas (KKM = 68)"
            >
              <PassFailPie students={students} />
            </ChartCard>
            <ChartCard
              title="Distribusi Nilai"
              subtitle="Hover/klik garis untuk melihat nama siswa"
              className="lg:col-span-3"
            >
              <ScoreDistributionLine students={students} />
            </ChartCard>
          </div>
        </>
      )}
    </section>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-gradient-card p-5 shadow-card-soft ${className}`}
    >
      <h4 className="font-semibold text-foreground">{title}</h4>
      <p className="mb-3 text-xs text-muted-foreground">{subtitle}</p>
      {children}
    </div>
  );
}
