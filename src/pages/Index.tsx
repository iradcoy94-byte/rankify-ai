import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  Users,
  TrendingUp,
  Trophy,
  Filter,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Uploader } from "@/components/Uploader";
import { Podium } from "@/components/Podium";
import { RankingTable } from "@/components/RankingTable";
import { ScoreChart } from "@/components/ScoreChart";
import { AIAssistant } from "@/components/AIAssistant";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStudents } from "@/hooks/useStudents";
import { parseOcrText } from "@/lib/parser";
import { recompute } from "@/lib/ranking";
import { toast } from "sonner";

const ALL = "__all__";
const NONE = "__none__";

/**
 * Main page composing the Rankify.AI experience:
 * 1. Hero + uploader (each upload APPENDS to the dataset)
 * 2. Class filter + leaderboard + table for the selected class
 * 3. Floating AI assistant
 */
const Index = () => {
  const {
    students,
    stats,
    classes,
    appendStudents,
    updateField,
    removeRow,
    addRow,
    clear,
  } = useStudents();
  const [classFilter, setClassFilter] = useState<string>(ALL);

  /** Wire OCR result → flexible parser → APPEND to existing data. */
  const handleExtracted = (text: string) => {
    const parsed = parseOcrText(text);
    if (parsed.length === 0) {
      toast.warning(
        "Tidak menemukan baris 'Nama Nilai'. Coba tambah baris manual.",
      );
      return;
    }
    appendStudents(parsed);
    toast.success(`${parsed.length} siswa ditambahkan`);
    requestAnimationFrame(() => {
      document
        .getElementById("ranking")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  /**
   * Filtered view of the dataset for the active class. Ranks are recomputed
   * for the SUBSET so the leaderboard reflects rankings within that class
   * (even though stored ranks are already per-class).
   */
  const filtered = useMemo(() => {
    if (classFilter === ALL) return students;
    if (classFilter === NONE)
      return recompute(
        students.filter((s) => !s.className || !s.className.trim()),
      );
    return recompute(
      students.filter(
        (s) => (s.className ?? "").trim().toUpperCase() === classFilter,
      ),
    );
  }, [students, classFilter]);

  const hasUnclassified = students.some(
    (s) => !s.className || !s.className.trim(),
  );

  return (
    <main className="relative min-h-screen pb-32">
      <Header />

      {/* HERO + UPLOAD */}
      <section className="container grid gap-10 pt-6 lg:grid-cols-[1.1fr_1fr] lg:pt-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col justify-center"
        >
          <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
            <Trophy className="h-3.5 w-3.5 text-primary" />
            Ranking siswa otomatis dalam 3 langkah
          </span>
          <h2 className="text-balance text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Ranking udah keluar.{" "}
            <span className="text-gradient-primary">Lo di mana?</span>
          </h2>
          <p className="mt-5 max-w-xl text-justify text-sm text-muted-foreground md:text-base leading-relaxed">
            Rankify.AI adalah platform berbasis web yang mengubah gambar data nilai siswa menjadi peringkat kelas secara otomatis menggunakan teknologi OCR dan AI. Dilengkapi dengan fitur edit manual, validasi data, leaderboard interaktif, serta AI Assistant untuk analisis pembelajaran.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Uploader onTextExtracted={handleExtracted} />
        </motion.div>
      </section>

      {/* RANKING SECTION */}
      <section id="ranking" className="container mt-20 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-3xl font-bold">Papan Peringkat Peserta Didik</h3>
            <p className="text-sm text-muted-foreground">
              {students.length > 0
                ? "Edit data di tabel untuk memperbaiki hasil OCR."
                : "Coba liat, peringkat berapa kamu?"}
            </p>
          </div>
          {students.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Class filter */}
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-2 py-1 backdrop-blur">
                <Filter className="ml-1 h-3.5 w-3.5 text-primary" />
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="h-8 w-[160px] border-0 bg-transparent text-xs focus:ring-0">
                    <SelectValue placeholder="Filter kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Semua kelas</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                    {hasUnclassified && (
                      <SelectItem value={NONE}>Tanpa kelas</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <StatChip
                icon={<Users className="h-3.5 w-3.5" />}
                label="Siswa"
                value={
                  classFilter === ALL ? stats.total : filtered.length
                }
              />
              <StatChip
                icon={<CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                label="Valid"
                value={
                  classFilter === ALL
                    ? stats.valid
                    : filtered.filter((s) => s.isValid).length
                }
              />
              <StatChip
                icon={<AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                label="Invalid"
                value={
                  classFilter === ALL
                    ? stats.invalid
                    : filtered.filter((s) => !s.isValid).length
                }
              />
              <StatChip
                icon={<TrendingUp className="h-3.5 w-3.5 text-primary" />}
                label="Rata-rata"
                value={
                  classFilter === ALL
                    ? stats.avg
                    : avgOf(filtered)
                }
              />
              <Button variant="outline" size="sm" onClick={clear}>
                Reset
              </Button>
            </div>
          )}
        </div>

        <Podium students={filtered} />

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <RankingTable
            students={filtered}
            onUpdate={updateField}
            onRemove={removeRow}
            onAdd={() => addRow(classFilter !== ALL && classFilter !== NONE ? classFilter : undefined)}
          />

          <div className="rounded-2xl border border-border bg-gradient-card p-5 shadow-card-soft">
            <h4 className="mb-1 font-semibold">Distribusi Nilai</h4>
            <p className="mb-3 text-xs text-muted-foreground">
              {classFilter === ALL
                ? "Semua siswa valid."
                : `Kelas ${classFilter === NONE ? "Tanpa kelas" : classFilter}`}
            </p>
            <ScoreChart students={filtered} />
          </div>
        </div>
      </section>

      <AIAssistant students={filtered} />
    </main>
  );
};

/** Mean of valid scores, rounded to 1 decimal */
function avgOf(list: { score: number; isValid: boolean }[]) {
  const valid = list.filter((s) => s.isValid);
  if (valid.length === 0) return 0;
  return Math.round((valid.reduce((a, b) => a + b.score, 0) / valid.length) * 10) / 10;
}

function StatChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 backdrop-blur">
      {icon}
      <div className="leading-tight">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="font-mono text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}

export default Index;
