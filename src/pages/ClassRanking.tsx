import { useEffect, useMemo, useState } from "react";
import { Filter, TrendingUp, Users } from "lucide-react";
import { Podium } from "@/components/Podium";
import { RankingTable } from "@/components/RankingTable";
import { ScoreDistributionLine } from "@/components/ScoreDistributionLine";
import { PrePostTable } from "@/components/PrePostTable";
import { PassFailPie } from "@/components/PassFailPie";
import { MeetingProgressChart } from "@/components/MeetingProgressChart";
import { TopRankersTable } from "@/components/TopRankersTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStudentsCtx } from "@/context/StudentsContext";
import { recompute } from "@/lib/ranking";
import { StatChip } from "@/components/StatChip";
import { EmptyState } from "@/components/EmptyState";
import { StudentClassRanking } from "@/components/StudentClassRanking";
import { useAuth } from "@/context/AuthContext";

const NONE = "__none__";

/** Per-class ranking with class filter. */
export default function ClassRanking() {
  const { students, classes, classKkm, activeMetrics, updateKkm, updateField, removeRow, addRow, canManageData } =
    useStudentsCtx();
  const { isReadOnly } = useAuth();
  const [classFilter, setClassFilter] = useState<string>(NONE);
  const [meetingFilter, setMeetingFilter] = useState<number | "all">("all");

  useEffect(() => {
    if (classFilter === NONE && classes.length > 0) {
      setClassFilter(classes[0]);
    }
  }, [classes, classFilter]);

  const hasUnclassified = students.some(
    (s) => !s.className || !s.className.trim(),
  );

  const classFilteredAll = useMemo(() => {
    if (classFilter === NONE)
      return students.filter((s) => !s.className || !s.className.trim());
    return students.filter(
      (s) => (s.className ?? "").trim().toUpperCase() === classFilter.toUpperCase(),
    );
  }, [students, classFilter]);

  const meetingRowsAll = useMemo(
    () =>
      classFilteredAll.filter(
        (s) => s.kind !== "pretest" && s.kind !== "posttest",
      ),
    [classFilteredAll],
  );

  const meetingOptions = useMemo(() => {
    const set = new Set<number>();
    meetingRowsAll.forEach((s) => set.add(s.meeting ?? 1));
    return Array.from(set).sort((a, b) => a - b);
  }, [meetingRowsAll]);

  const classFiltered = useMemo(() => {
    const filtered =
      meetingFilter === "all"
        ? meetingRowsAll
        : meetingRowsAll.filter((s) => (s.meeting ?? 1) === meetingFilter);
    return recompute(filtered);
  }, [meetingRowsAll, meetingFilter]);

  if (isReadOnly) return <StudentClassRanking students={students} />;
  const currentKkm = classKkm[classFilter] ?? 68;

  return (
    <section className="container mt-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-3xl font-bold">Peringkat Siswa per Kelas</h3>
          <p className="text-sm text-muted-foreground">
            Pilih kelas untuk melihat peringkat di dalam kelas tersebut.
          </p>
        </div>

        {classFilter !== NONE && canManageData && <label key={classFilter} className="flex items-center gap-2 text-xs text-muted-foreground">KKM kelas <input aria-label={`KKM ${classFilter}`} className="h-9 w-20 rounded-md border border-input bg-background px-2 text-sm text-foreground" type="number" min={0} max={100} defaultValue={currentKkm} onBlur={(event) => { if (Number(event.target.value) !== currentKkm) void updateKkm(classFilter, Number(event.target.value)); }} /></label>}

        {students.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-2 py-1 backdrop-blur">
              <Filter className="ml-1 h-3.5 w-3.5 text-primary" />
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="h-8 w-[180px] border-0 bg-transparent text-xs focus:ring-0">
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                  {hasUnclassified && (
                    <SelectItem value={NONE}>Tanpa kelas</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <StatChip icon={<Users className="h-3.5 w-3.5" />} label="Siswa" value={classFiltered.length} />
            <StatChip icon={<TrendingUp className="h-3.5 w-3.5 text-primary" />} label="Rata-rata" value={avgOf(classFiltered)} />
          </div>
        )}
      </div>

      {students.length === 0 ? (
        <EmptyState />
      ) : classFiltered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Belum ada siswa untuk kelas ini.
        </div>
      ) : (
        <>
          <Podium students={classFiltered} />

          <RankingTable
            students={classFiltered}
            onUpdate={updateField}
            onRemove={removeRow}
            onAdd={() => addRow(classFilter !== NONE ? classFilter : undefined)}
            hideClass
            meetingOptions={meetingOptions}
            meetingFilter={meetingFilter}
            onMeetingFilterChange={setMeetingFilter}
            readOnly={!canManageData}
            threshold={currentKkm}
          />

          <TopRankersTable
            students={meetingRowsAll}
            subtitle={`Top 3 siswa dengan total peringkat 1 terbanyak di kelas ${
              classFilter === NONE ? "tanpa kelas" : classFilter
            }`}
          />

          {activeMetrics.prepost && <div className="grid gap-6 lg:grid-cols-2">
            <PrePostTable
              students={classFilteredAll}
              kind="pretest"
              onUpdate={updateField}
              onRemove={removeRow}
              hideClass
              readOnly={!canManageData}
              threshold={currentKkm}
            />
            <PrePostTable
              students={classFilteredAll}
              kind="posttest"
              onUpdate={updateField}
              onRemove={removeRow}
              hideClass
              readOnly={!canManageData}
              threshold={currentKkm}
            />
          </div>}

          <div className="grid gap-6 lg:grid-cols-3">
            <ChartCard
              title="Perkembangan per Pertemuan"
              subtitle={`Rata-rata kelas ${classFilter === NONE ? "tanpa kelas" : classFilter}`}
              className="lg:col-span-2"
            >
              <MeetingProgressChart students={classFiltered} />
            </ChartCard>
            <ChartCard
              title="Ketuntasan Belajar"
              subtitle={`Tuntas vs belum tuntas (KKM = ${currentKkm})`}
            >
              <PassFailPie students={classFiltered} threshold={currentKkm} />
            </ChartCard>
            <ChartCard
              title="Distribusi Nilai"
              subtitle="Hover/klik garis untuk melihat nama siswa"
              className="lg:col-span-3"
            >
              <ScoreDistributionLine students={classFiltered} />
            </ChartCard>
          </div>
        </>
      )}
    </section>
  );
}

function avgOf(list: { score: number; isValid: boolean }[]) {
  const valid = list.filter((s) => s.isValid);
  if (valid.length === 0) return 0;
  return Math.round((valid.reduce((a, b) => a + b.score, 0) / valid.length) * 10) / 10;
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
