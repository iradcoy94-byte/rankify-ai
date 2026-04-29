import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Users, TrendingUp, RefreshCw, Trophy } from "lucide-react";
import { Header } from "@/components/Header";
import { Uploader } from "@/components/Uploader";
import { Podium } from "@/components/Podium";
import { RankingTable } from "@/components/RankingTable";
import { ScoreChart } from "@/components/ScoreChart";
import { AIAssistant } from "@/components/AIAssistant";
import { Button } from "@/components/ui/button";
import { useStudents } from "@/hooks/useStudents";
import { parseOcrText } from "@/lib/parser";
import { toast } from "sonner";

/**
 * Main page composing the Rankify.AI experience:
 * 1. Hero + uploader
 * 2. Stats / leaderboard / table
 * 3. Floating AI assistant
 *
 * All business logic lives in hooks/services — this file is a thin
 * orchestration layer.
 */
const Index = () => {
  const { students, stats, replaceAll, updateField, removeRow, addRow, clear } =
    useStudents();
  const [hasParsed, setHasParsed] = useState(false);

  /** Wire OCR result → flexible parser → state */
  const handleExtracted = (text: string) => {
    const parsed = parseOcrText(text);
    if (parsed.length === 0) {
      toast.warning(
        "Tidak menemukan baris 'Nama Nilai'. Coba tambah baris manual.",
      );
    }
    replaceAll(parsed);
    setHasParsed(true);
    // Smooth scroll to ranking
    requestAnimationFrame(() => {
      document
        .getElementById("ranking")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

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
            Foto daftar nilai.{" "}
            <span className="text-gradient-primary">Dapat leaderboard.</span>
          </h2>
          <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            Rankify.AI menggunakan OCR + AI untuk mengekstrak nama dan nilai
            siswa dari gambar, memvalidasinya, dan menyusun ranking dengan
            sistem <strong className="text-foreground">dense ranking</strong>{" "}
            (1, 1, 2, 3).
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <FeaturePill icon={<CheckCircle2 className="h-3.5 w-3.5" />} text="Validasi nilai 0–100" />
            <FeaturePill icon={<RefreshCw className="h-3.5 w-3.5" />} text="Edit inline real-time" />
            <FeaturePill icon={<TrendingUp className="h-3.5 w-3.5" />} text="Insight AI" />
          </div>
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
            <h3 className="text-3xl font-bold">Leaderboard Kelas</h3>
            <p className="text-sm text-muted-foreground">
              {hasParsed || students.length > 0
                ? "Edit data di tabel untuk memperbaiki hasil OCR."
                : "Upload gambar untuk melihat ranking di sini."}
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
            onAdd={addRow}
          />

          <div className="rounded-2xl border border-border bg-gradient-card p-5 shadow-card-soft">
            <h4 className="mb-1 font-semibold">Distribusi Nilai</h4>
            <p className="mb-3 text-xs text-muted-foreground">
              Hanya menampilkan baris yang valid.
            </p>
            <ScoreChart students={students} />
          </div>
        </div>
      </section>

      <AIAssistant students={students} />
    </main>
  );
};

/* ---------- Small inline UI atoms ---------- */

function FeaturePill({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs text-foreground/80">
      <span className="text-primary">{icon}</span>
      {text}
    </span>
  );
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
