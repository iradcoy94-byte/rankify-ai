import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  Bot,
  Check,
  ChevronsUpDown,
  LineChart as LineChartIcon,
  Medal,
  Target,
  TrendingDown,
  TrendingUp,
  UserRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/InfoTooltip";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStudentsCtx } from "@/context/StudentsContext";
import type { Student } from "@/lib/types";
import { cn } from "@/lib/utils";
import { calculateNGain as getNGain } from "@/lib/ranking";

const KKM = 68;

interface StudentProfile {
  key: string;
  name: string;
  className: string;
  absentNumber: number;
  rows: Student[];
  meetingScores: { meeting: number; score: number }[];
  pretest?: number;
  posttest?: number;
  currentScore?: number;
  classRank?: number;
  totalClassRanked: number;
  overallRank?: number;
  totalOverallRanked: number;
  totalClassGroups: number;
}

interface RankHistoryRow {
  meeting: number;
  score?: number;
  rank?: number;
  total: number;
  change?: number;
}

interface ProgressPoint {
  meeting: string;
  "Nilai siswa"?: number;
  "Rata-rata kelas"?: number;
}

interface PrePostPoint {
  label: string;
  nilai?: number;
}

export default function Analysis() {
  const { students, classKkm, activeMetrics } = useStudentsCtx();
  const profiles = useMemo(() => buildProfiles(students), [students]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const selected = profiles.find((p) => p.key === selectedKey) ?? null;
  const selectedKkm = selected ? classKkm[selected.className] ?? KKM : KKM;

  useEffect(() => {
    if (selectedKey && profiles.length > 0 && !profiles.some((p) => p.key === selectedKey)) {
      setSelectedKey("");
    }
  }, [profiles, selectedKey]);

  const progressData = useMemo(
    () => (selected ? buildProgressData(students, selected) : []),
    [students, selected],
  );
  const prePostData = useMemo<PrePostPoint[]>(
    () => [
      { label: "Sebelum Belajar", nilai: selected?.pretest },
      { label: "Sesudah Belajar", nilai: selected?.posttest },
    ],
    [selected],
  );
  const rankHistory = useMemo(
    () => (selected ? buildRankHistory(students, selected) : []),
    [students, selected],
  );

  return (
    <section className="container mt-8 space-y-8 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-3xl font-bold">Peningkatan Saya</h3>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Ringkasan perkembangan belajar satu siswa, mulai dari perubahan nilai,
            posisi di kelas, posisi gabungan, sampai rekomendasi belajar personal.
          </p>
        </div>
        <StudentSelector
          profiles={profiles}
          selected={selected}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
        />
      </div>

      {profiles.length === 0 ? (
        <EmptyState message="Belum ada data siswa valid. Upload atau input data terlebih dahulu." />
      ) : !selected ? (
        <EmptyState message="Pilih siswa untuk melihat analisis peningkatan." />
      ) : (
        <>
          <SelectedStudentCard student={selected} kkm={selectedKkm} />
          <SummaryCards student={selected} kkm={selectedKkm} metrics={activeMetrics} />

          <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
            <Block
              title="Grafik Perkembangan Per Pertemuan"
              subtitle="Lihat bagaimana nilai anak Anda berubah dari waktu ke waktu, dibandingkan rata-rata teman sekelas (garis putus-putus)."
            >
              <IndividualProgressChart data={progressData} kkm={selectedKkm} />
            </Block>

            {activeMetrics.prepost && <Block
              title="Perbandingan Nilai Sebelum dan Sesudah Belajar"
              subtitle="Perbandingan nilai sebelum dan sesudah belajar."
            >
              <PrePostBarChart data={prePostData} kkm={selectedKkm} />
            </Block>}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
            <Block
              title="Insight dan Rekomendasi Personal"
              subtitle="Ringkasan otomatis berdasarkan data siswa terpilih."
            >
              <PersonalInsight student={selected} rankHistory={rankHistory} kkm={selectedKkm} metrics={activeMetrics} />
            </Block>

            <Block
              title="Riwayat Peringkat"
              subtitle="Perubahan posisi siswa dari pertemuan ke pertemuan."
            >
              <RankHistoryTable rows={rankHistory} />
            </Block>
          </div>
        </>
      )}
    </section>
  );
}

function StudentSelector({
  profiles,
  selected,
  selectedKey,
  onSelect,
}: {
  profiles: StudentProfile[];
  selected: StudentProfile | null;
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-auto min-h-12 w-full justify-between gap-3 border-border/70 bg-card/60 px-3 py-2 text-left shadow-card-soft lg:w-[420px]"
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-3">
              <InitialAvatar name={selected.name} />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{selected.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {selected.className} - Absen {selected.absentNumber}
                </span>
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">Pilih siswa</span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] p-0 sm:w-[420px]" align="end">
        <Command>
          <CommandInput placeholder="Cari nama atau kelas..." />
          <CommandList>
            <CommandEmpty>Siswa tidak ditemukan.</CommandEmpty>
            <CommandGroup>
              {profiles.map((profile) => (
                <CommandItem
                  key={profile.key}
                  value={`${profile.name} ${profile.className} ${profile.absentNumber}`}
                  onSelect={() => {
                    onSelect(profile.key);
                    setOpen(false);
                  }}
                  className="gap-3"
                >
                  <InitialAvatar name={profile.name} className="h-8 w-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{profile.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {profile.className} - Absen {profile.absentNumber}
                    </p>
                  </div>
                  <Check
                    className={cn(
                      "h-4 w-4 text-primary",
                      selectedKey === profile.key ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function SelectedStudentCard({ student, kkm }: { student: StudentProfile; kkm: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-gradient-card p-5 shadow-card-soft"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <InitialAvatar name={student.name} className="h-16 w-16 text-lg" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-xl font-bold">{student.name}</h4>
              <Badge variant="outline" className="border-primary/40 text-primary">
                {student.className}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Nomor absen {student.absentNumber} - {student.rows.length} data nilai
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
            {student.meetingScores.length} pertemuan
          </Badge>
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-0.5 font-semibold text-accent">
            Standar nilai {kkm}
            <InfoTooltip label="standar nilai minimum" className="h-5 w-5">
              Standar nilai minimum adalah batas nilai yang digunakan sekolah
              untuk melihat apakah siswa sudah mencapai target belajar.
            </InfoTooltip>
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function SummaryCards({ student, kkm, metrics }: { student: StudentProfile; kkm: number; metrics: Record<string, boolean> }) {
  const nGain = getNGain(student.pretest, student.posttest);
  const gainCategory = getNGainCategory(nGain);
  const gainExplanation = getNGainExplanation(nGain);
  const pass = typeof student.currentScore === "number" && student.currentScore >= kkm;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {metrics.prepost && <KpiCard
        icon={<Target className="h-4 w-4" />}
        label="Nilai Sebelum & Sesudah Belajar"
        value={`${formatScore(student.pretest)} -> ${formatScore(student.posttest)}`}
        detail="Nilai awal dibandingkan nilai akhir"
        tone="primary"
      />}
      {metrics.nGain && <KpiCard
        icon={<TrendingUp className="h-4 w-4" />}
        label="N-Gain"
        value={nGain === undefined ? "-" : nGain.toFixed(2)}
        detail={`${gainCategory}: ${gainExplanation}`}
        tone={gainCategory === "Tinggi" ? "success" : gainCategory === "Rendah" ? "warning" : "primary"}
      />}
      <KpiCard
        icon={pass ? <Check className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        label={
          <span className="inline-flex items-center gap-1">
            Sudah Mencapai Standar Nilai Minimum?
            <InfoTooltip label="standar nilai minimum">
              Standar nilai minimum adalah batas nilai yang dipakai untuk
              menentukan apakah siswa sudah mencapai target belajar. Di halaman
              ini batasnya adalah {kkm}.
            </InfoTooltip>
          </span>
        }
        value={pass ? "Tuntas" : "Belum Tuntas"}
        detail={
          pass
            ? `Nilai sudah melewati batas minimum (${kkm})`
            : `Nilai belum melewati batas minimum (${kkm})`
        }
        tone={pass ? "success" : "destructive"}
      />
      <KpiCard
        icon={<Award className="h-4 w-4" />}
        label={
          <span className="inline-flex items-center gap-1">
            Peringkat di Kelas
            <InfoTooltip label="peringkat di kelas">
              Posisi siswa dibandingkan teman-teman dalam kelas yang sama,
              dihitung dari nilai terbaru yang tersedia.
            </InfoTooltip>
          </span>
        }
        value={
          student.classRank
            ? `Rank ${student.classRank} dari ${student.totalClassRanked}`
            : "-"
        }
        detail={`siswa di kelas ${student.className}`}
        tone="primary"
      />
      <KpiCard
        icon={<Award className="h-4 w-4" />}
        label={
          <span className="inline-flex items-center gap-1">
            Peringkat Keseluruhan
            <InfoTooltip label="peringkat keseluruhan">
              Posisi siswa dibandingkan seluruh siswa dari semua kelas yang
              tersedia, dihitung dari nilai terbaru yang tersedia.
            </InfoTooltip>
          </span>
        }
        value={
          student.overallRank
            ? `Rank ${student.overallRank} dari ${student.totalOverallRanked}`
            : "-"
        }
        detail={`gabungan ${student.totalClassGroups} kelas`}
        tone="primary"
      />
    </div>
  );
}

function IndividualProgressChart({ data, kkm }: { data: ProgressPoint[]; kkm: number }) {
  if (data.length < 2) {
    return (
      <EmptyChart icon={<LineChartIcon className="h-5 w-5" />}>
        Tambahkan nilai untuk minimal 2 pertemuan agar tren perkembangan muncul.
      </EmptyChart>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="meeting"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
        />
        <ReferenceLine y={kkm} stroke="hsl(var(--warning))" strokeDasharray="4 4" />
        <Tooltip contentStyle={tooltipStyle} />
        <Line
          type="monotone"
          dataKey="Nilai siswa"
          stroke="hsl(var(--primary))"
          strokeWidth={3}
          dot={{ r: 5, fill: "hsl(var(--accent))", strokeWidth: 0 }}
          activeDot={{ r: 7 }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="Rata-rata kelas"
          stroke="hsl(var(--muted-foreground))"
          strokeDasharray="6 6"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function PrePostBarChart({ data, kkm }: { data: PrePostPoint[]; kkm: number }) {
  const hasData = data.some((d) => typeof d.nilai === "number");
  if (!hasData) {
    return (
      <EmptyChart icon={<Medal className="h-5 w-5" />}>
        Isi nilai sebelum dan sesudah belajar untuk melihat perbandingan.
      </EmptyChart>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="studentPrePostGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
        <ReferenceLine y={kkm} stroke="hsl(var(--warning))" strokeDasharray="4 4" />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="nilai" radius={[8, 8, 0, 0]} fill="url(#studentPrePostGrad)">
          {data.map((entry) => (
            <Cell
              key={entry.label}
              fill={entry.label === "Sesudah Belajar" ? "url(#studentPrePostGrad)" : "hsl(var(--primary) / 0.55)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function PersonalInsight({
  student,
  rankHistory,
  kkm,
  metrics,
}: {
  student: StudentProfile;
  rankHistory: RankHistoryRow[];
  kkm: number;
  metrics: Record<string, boolean>;
}) {
  const insight = useMemo(() => buildLocalInsight(student, rankHistory, kkm, metrics), [student, rankHistory, kkm, metrics]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Bot className="h-4 w-4 text-primary" />
        Insight berdasarkan data pribadi
      </div>
      <div className="min-h-[180px] whitespace-pre-line rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm leading-6 text-foreground/90">
        {insight}
      </div>
    </div>
  );
}

function RankHistoryTable({ rows }: { rows: RankHistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyChart icon={<Award className="h-5 w-5" />}>
        Belum ada riwayat peringkat per pertemuan untuk siswa ini.
      </EmptyChart>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Pertemuan</th>
              <th className="px-4 py-3">Nilai</th>
              <th className="px-4 py-3">Peringkat</th>
              <th className="px-4 py-3">Perubahan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.meeting} className="border-t border-border/60 hover:bg-secondary/30">
                <td className="px-4 py-3 font-medium">P{row.meeting}</td>
                <td className="px-4 py-3 font-mono">{formatScore(row.score)}</td>
                <td className="px-4 py-3 font-mono">
                  {row.rank ? `${row.rank} / ${row.total}` : "-"}
                </td>
                <td className="px-4 py-3">
                  <RankChange change={row.change} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RankChange({ change }: { change?: number }) {
  if (change === undefined || change === 0) {
    return <span className="text-xs text-muted-foreground">Stabil</span>;
  }
  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
        <TrendingUp className="h-3 w-3" />
        Naik {change}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
      <TrendingDown className="h-3 w-3" />
      Turun {Math.abs(change)}
    </span>
  );
}

function Block({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-2xl border border-border bg-gradient-card p-5 shadow-card-soft"
    >
      <h4 className="font-semibold text-foreground">{title}</h4>
      <p className="mb-4 text-xs text-muted-foreground">{subtitle}</p>
      {children}
    </motion.div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  value: string;
  detail: string;
  tone: "primary" | "success" | "destructive" | "warning";
}) {
  const toneClass = {
    primary: "text-primary",
    success: "text-success",
    destructive: "text-destructive",
    warning: "text-warning",
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-2xl border border-border bg-gradient-card p-4 shadow-card-soft"
    >
      <div className={cn("mb-2 inline-flex items-center gap-2", toneClass)}>
        {icon}
        <span className="text-[11px] uppercase leading-4 tracking-wide">{label}</span>
      </div>
      <p className="text-xl font-bold leading-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </motion.div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="grid min-h-[320px] place-items-center rounded-2xl border border-dashed border-border bg-gradient-card px-6 text-center shadow-card-soft">
      <div className="max-w-md">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <UserRound className="h-6 w-6" />
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function EmptyChart({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[260px] place-items-center rounded-xl border border-dashed border-border px-6 text-center text-sm text-muted-foreground">
      <div>
        <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-secondary text-primary">
          {icon}
        </div>
        {children}
      </div>
    </div>
  );
}

function InitialAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <Avatar className={cn("border border-primary/30 shadow-glow", className)}>
      <AvatarFallback className="bg-gradient-primary font-bold text-primary-foreground">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

function buildProfiles(students: Student[]): StudentProfile[] {
  const valid = students.filter((s) => s.isValid && s.name.trim());
  const grouped = new Map<string, Student[]>();
  for (const row of valid) {
    const key = getStudentKey(row.name, row.className, row.studentId);
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }

  const absentNumbers = buildAbsentNumbers(valid);
  const profiles = Array.from(grouped.entries()).map(([key, rows]) => {
    const first = rows[0];
    const className = normalizeClass(first.className);
    const meetingScores = buildMeetingScores(rows);
    const pretest = average(getPrePostScores(rows, "pretest"));
    const posttest = average(getPrePostScores(rows, "posttest"));
    const latestMeeting = meetingScores.at(-1)?.score;
    return {
      key,
      name: first.name.trim(),
      className,
      absentNumber: absentNumbers.get(key) ?? 1,
      rows,
      meetingScores,
      pretest,
      posttest,
      currentScore: posttest ?? latestMeeting ?? pretest,
      totalClassRanked: 0,
      totalOverallRanked: 0,
      totalClassGroups: 0,
    };
  });

  const ranked = applyProfileRanking(profiles);
  return ranked.sort((a, b) => a.className.localeCompare(b.className) || a.absentNumber - b.absentNumber);
}

function applyProfileRanking(profiles: StudentProfile[]): StudentProfile[] {
  const overall = rankProfiles(profiles);
  const classRanks = new Map<
    string,
    { rank?: number; total: number }
  >();
  const classes = new Set(profiles.map((profile) => profile.className));

  for (const className of classes) {
    const rankedClass = rankProfiles(
      profiles.filter((profile) => profile.className === className),
    );
    for (const profile of rankedClass.profiles) {
      classRanks.set(profile.key, {
        rank: profile.overallRank,
        total: rankedClass.total,
      });
    }
  }

  return overall.profiles.map((profile) => {
    const classRank = classRanks.get(profile.key);
    return {
      ...profile,
      overallRank: profile.overallRank,
      totalOverallRanked: overall.total,
      classRank: classRank?.rank,
      totalClassRanked: classRank?.total ?? 0,
      totalClassGroups: classes.size,
    };
  });
}

function rankProfiles(profiles: StudentProfile[]) {
  const withScore = profiles
    .filter((p) => typeof p.currentScore === "number")
    .sort((a, b) => (b.currentScore ?? 0) - (a.currentScore ?? 0));
  let rank = 0;
  let lastScore: number | undefined;
  const rankMap = new Map<string, number>();
  for (const profile of withScore) {
    if (lastScore === undefined || profile.currentScore !== lastScore) {
      rank += 1;
      lastScore = profile.currentScore;
    }
    rankMap.set(profile.key, rank);
  }
  return {
    total: withScore.length,
    profiles: profiles.map((p) => ({
      ...p,
      overallRank: rankMap.get(p.key),
    })),
  };
}

function buildAbsentNumbers(students: Student[]) {
  const byClass = new Map<string, Map<string, string>>();
  for (const row of students) {
    const className = normalizeClass(row.className);
    const key = getStudentKey(row.name, row.className, row.studentId);
    const members = byClass.get(className) ?? new Map<string, string>();
    members.set(key, row.name.trim());
    byClass.set(className, members);
  }

  const result = new Map<string, number>();
  for (const members of byClass.values()) {
    [...members.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .forEach(([key], index) => result.set(key, index + 1));
  }
  return result;
}

function buildMeetingScores(rows: Student[]) {
  const map = new Map<number, number[]>();
  for (const row of rows) {
    if (row.kind === "pretest" || row.kind === "posttest") continue;
    const meeting = row.meeting ?? 1;
    map.set(meeting, [...(map.get(meeting) ?? []), row.score]);
  }
  return Array.from(map.entries())
    .map(([meeting, scores]) => ({ meeting, score: round1(average(scores) ?? 0) }))
    .sort((a, b) => a.meeting - b.meeting);
}

function buildProgressData(students: Student[], selected: StudentProfile): ProgressPoint[] {
  const meetingRows = students.filter(
    (s) =>
      s.isValid &&
      s.kind !== "pretest" &&
      s.kind !== "posttest" &&
      normalizeClass(s.className) === selected.className,
  );
  const meetings = Array.from(
    new Set([...selected.meetingScores.map((s) => s.meeting), ...meetingRows.map((s) => s.meeting ?? 1)]),
  ).sort((a, b) => a - b);

  return meetings.map((meeting) => {
    const classRows = meetingRows.filter((s) => (s.meeting ?? 1) === meeting);
    return {
      meeting: `P${meeting}`,
      "Nilai siswa": selected.meetingScores.find((s) => s.meeting === meeting)?.score,
      "Rata-rata kelas": round1(average(classRows.map((s) => s.score))),
    };
  });
}

function buildRankHistory(students: Student[], selected: StudentProfile): RankHistoryRow[] {
  const meetingRows = students.filter(
    (s) => s.isValid && s.kind !== "pretest" && s.kind !== "posttest",
  );
  const meetings = Array.from(new Set(meetingRows.map((s) => s.meeting ?? 1))).sort((a, b) => a - b);
  const rows: RankHistoryRow[] = [];
  let previousRank: number | undefined;

  for (const meeting of meetings) {
    const byStudent = new Map<string, { scores: number[]; name: string }>();
    for (const row of meetingRows.filter((s) => (s.meeting ?? 1) === meeting)) {
      const key = getStudentKey(row.name, row.className, row.studentId);
      const cur = byStudent.get(key) ?? { scores: [], name: row.name };
      cur.scores.push(row.score);
      byStudent.set(key, cur);
    }

    const ranking = Array.from(byStudent.entries())
      .map(([key, value]) => ({ key, score: round1(average(value.scores) ?? 0) }))
      .sort((a, b) => b.score - a.score);
    let rank = 0;
    let lastScore: number | undefined;
    const rankMap = new Map<string, number>();
    for (const item of ranking) {
      if (lastScore === undefined || item.score !== lastScore) {
        rank += 1;
        lastScore = item.score;
      }
      rankMap.set(item.key, rank);
    }

    const selectedScore = ranking.find((item) => item.key === selected.key)?.score;
    const currentRank = rankMap.get(selected.key);
    rows.push({
      meeting,
      score: selectedScore,
      rank: currentRank,
      total: ranking.length,
      change:
        previousRank !== undefined && currentRank !== undefined
          ? previousRank - currentRank
          : undefined,
    });
    if (currentRank !== undefined) previousRank = currentRank;
  }

  return rows.filter((row) => row.score !== undefined || row.rank !== undefined);
}

function getPrePostScores(rows: Student[], kind: "pretest" | "posttest") {
  const scores: number[] = [];
  for (const row of rows) {
    const direct = kind === "pretest" ? row.pretest : row.posttest;
    if (typeof direct === "number" && !Number.isNaN(direct)) scores.push(direct);
    if (row.kind === kind && !Number.isNaN(row.score)) scores.push(row.score);
  }
  return scores;
}

function getNGainCategory(value?: number) {
  if (value === undefined) return "Data belum lengkap";
  if (value >= 0.7) return "Tinggi";
  if (value >= 0.3) return "Sedang";
  return "Rendah";
}

function getNGainExplanation(value?: number) {
  if (value === undefined) return "butuh nilai sebelum dan sesudah belajar";
  if (value >= 0.7) return "Peningkatan sangat baik 🎉";
  if (value >= 0.3) return "Peningkatan cukup baik 👍";
  return "Peningkatan masih perlu didorong lagi 💪";
}

function buildLocalInsight(student: StudentProfile, rankHistory: RankHistoryRow[], kkm: number, metrics: Record<string, boolean>) {
  const first = student.meetingScores[0]?.score;
  const last = student.meetingScores.at(-1)?.score;
  const delta = typeof first === "number" && typeof last === "number" ? round1(last - first) : undefined;
  const nGain = getNGain(student.pretest, student.posttest);
  const category = getNGainCategory(nGain);
  const pass = typeof student.currentScore === "number" && student.currentScore >= kkm;
  const best = student.meetingScores.reduce<{ meeting: number; score: number } | null>(
    (acc, item) => (!acc || item.score > acc.score ? item : acc),
    null,
  );
  const latestChange = rankHistory.at(-1)?.change;

  return [
    `Tren: ${student.name} ${delta === undefined ? "belum memiliki cukup data pertemuan untuk membaca tren." : delta >= 0 ? `meningkat ${delta} poin dari pertemuan awal ke terbaru.` : `turun ${Math.abs(delta)} poin dari pertemuan awal ke terbaru.`}`,
    `Kekuatan: capaian terbaik ada pada ${best ? `pertemuan ${best.meeting} dengan nilai ${best.score}` : "data yang sudah tersedia"}. Status saat ini ${pass ? "sudah melewati" : "belum melewati"} standar nilai minimum ${kkm}.`,
    ...(metrics.nGain ? [`Area perbaikan: tingkat peningkatan berada pada kategori ${category}${nGain === undefined ? " karena data nilai sebelum/sesudah belajar belum lengkap" : ` (${nGain.toFixed(2)})`}. ${getNGainExplanation(nGain)} Fokuskan latihan pada materi yang sering salah dan ulangi konsep dasar sebelum masuk soal variasi.`] : []),
    `Saran belajar: buat target nilai minimal ${kkm} pada latihan berikutnya, kerjakan 10-15 soal bertahap, lalu bandingkan peringkat per pertemuan${latestChange ? ` karena posisi terakhir ${latestChange > 0 ? "naik" : "turun"} ${Math.abs(latestChange)} tingkat.` : "."}`,
  ].join("\n\n");
}

function getStudentKey(name: string, className?: string, studentId?: string) {
  return studentId ?? `${normalizeName(name)}__${normalizeClass(className).toLowerCase()}`;
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeClass(className?: string) {
  return className?.trim() || "Tanpa Kelas";
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "S") + (parts[1]?.[0] ?? "");
}

function average(values: number[]) {
  const valid = values.filter((value) => typeof value === "number" && !Number.isNaN(value));
  if (valid.length === 0) return undefined;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function round1(value?: number) {
  return typeof value === "number" ? Math.round(value * 10) / 10 : undefined;
}

function formatScore(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  color: "hsl(var(--foreground))",
};
