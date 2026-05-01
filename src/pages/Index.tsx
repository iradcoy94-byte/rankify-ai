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
import { AnalysisSection } from "@/components/AnalysisSection";
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

const NONE = "__none__";

/**
 * Main page composes the Rankify.AI experience into 3 anchored sections so
 * the navbar can scroll between them:
 *  - #ranking-overall   : peringkat seluruh siswa lintas kelas
 *  - #ranking-class     : peringkat per kelas (filterable, kolom kelas disembunyikan)
 *  - #analysis          : analisis rata-rata, ketuntasan, top performer
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

  // Default to first available class once data exists; falls back to NONE.
  const [classFilter, setClassFilter] = useState<string>(NONE);

  /** OCR result → parser → APPEND to existing data. */
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
        .getElementById("ranking-overall")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  // Auto-pick the first class when one becomes available
  useMemo(() => {
    if (classFilter === NONE && classes.length > 0) {
      setClassFilter(classes[0]);
    }
  }, [classes, classFilter]);

  const hasUnclassified = students.some(
    (s) => !s.className || !s.className.trim(),
  );

  /** Per-class subset with ranks recomputed within that class. */
  const classFiltered = useMemo(() => {
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

      {/* SECTION 1 — OVERALL RANKING (lintas kelas) */}
      <section id="ranking-overall" className="container mt-20 space-y-8 scroll-mt-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-3xl font-bold">
              Peringkat Keseluruhan Siswa
            </h3>
            <p className="text-sm text-muted-foreground">
              Gabungan dari seluruh kelas — edit data di tabel untuk memperbaiki
              hasil OCR.
            </p>
          </div>
          {students.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <StatChip
                icon={<Users className="h-3.5 w-3.5" />}
                label="Siswa"
                value={stats.total}
              />
              <StatChip
                icon={<CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                label="Valid"
                value={stats.valid}
              />
              <StatChip
                icon={<AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                label="Invalid"
                value={stats.invalid}
              />
              <StatChip
                icon={<TrendingUp className="h-3.5 w-3.5 text-primary" />}
                label="Rata-rata"
                value={stats.avg}
              />
              <Button variant="outline" size="sm" onClick={clear}>
                Reset
              </Button>
            </div>
          )}
        </div>

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
      </section>

      {/* SECTION 2 — PER-CLASS RANKING */}
      <section id="ranking-class" className="container mt-24 space-y-8 scroll-mt-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-3xl font-bold">Peringkat Siswa per Kelas</h3>
            <p className="text-sm text-muted-foreground">
              Pilih kelas untuk melihat peringkat di dalam kelas tersebut.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-2 py-1 backdrop-blur">
              <Filter className="ml-1 h-3.5 w-3.5 text-primary" />
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="h-8 w-[180px] border-0 bg-transparent text-xs focus:ring-0">
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
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
              value={classFiltered.length}
            />
            <StatChip
              icon={<TrendingUp className="h-3.5 w-3.5 text-primary" />}
              label="Rata-rata"
              value={avgOf(classFiltered)}
            />
          </div>
        </div>

        {classFiltered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Belum ada siswa untuk kelas ini.
          </div>
        ) : (
          <>
            <Podium students={classFiltered} />
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <RankingTable
                students={classFiltered}
                onUpdate={updateField}
                onRemove={removeRow}
                onAdd={() =>
                  addRow(classFilter !== NONE ? classFilter : undefined)
                }
                hideClass
              />
              <div className="rounded-2xl border border-border bg-gradient-card p-5 shadow-card-soft">
                <h4 className="mb-1 font-semibold">Distribusi Nilai</h4>
                <p className="mb-3 text-xs text-muted-foreground">
                  Kelas {classFilter === NONE ? "Tanpa kelas" : classFilter}
                </p>
                <ScoreChart students={classFiltered} />
              </div>
            </div>
          </>
        )}
      </section>

      {/* SECTION 3 — ANALYSIS */}
      <section id="analysis" className="container mt-24 space-y-6 scroll-mt-20">
        <div>
          <h3 className="text-3xl font-bold">Analisis Peringkat Siswa</h3>
          <p className="text-sm text-muted-foreground">
            Insight ringkas: rata-rata, ketuntasan KKM (≥68), dan performa
            tertinggi tiap kelas.
          </p>
        </div>
        <AnalysisSection students={students} />
      </section>

      <AIAssistant students={students} />
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
