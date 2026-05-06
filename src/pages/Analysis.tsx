import { AnalysisSection } from "@/components/AnalysisSection";
import { MeetingProgressChart } from "@/components/MeetingProgressChart";
import {
  GainScoreChart,
  ModelEffectivenessChart,
  PrePostChart,
} from "@/components/StudyCharts";
import { useStudentsCtx } from "@/context/StudentsContext";
import { useMemo } from "react";
import type { Student } from "@/lib/types";

/** Standalone analysis page with full study-grade charts. */
export default function Analysis() {
  const { students } = useStudentsCtx();

  const hasMeetings = useMemo(
    () => new Set(students.map((s) => s.meeting ?? 1)).size >= 2,
    [students],
  );

  return (
    <section className="container mt-8 space-y-10 pb-12">
      <div>
        <h3 className="text-3xl font-bold">Analisis Peringkat Siswa</h3>
        <p className="text-sm text-muted-foreground">
          Insight ringkas: rata-rata, ketuntasan KKM (≥68), pretest vs
          posttest, gain score, perkembangan tiap pertemuan, serta efektivitas
          tiap model pembelajaran.
        </p>
      </div>

      {/* Existing high-level analytics */}
      <AnalysisSection students={students} />

      {/* ---- Pretest vs Posttest ---- */}
      <Block
        title="Perbandingan Pretest vs Posttest"
        subtitle="Rata-rata nilai pretest dan posttest tiap kelas. Isi kolom Pretest & Posttest pada tabel ranking untuk mengaktifkan grafik ini."
      >
        <PrePostChart students={students} />
      </Block>

      {/* ---- Gain Score ---- */}
      <Block
        title="Grafik Gain Score"
        subtitle="Selisih posttest − pretest. Hijau berarti peningkatan, merah berarti penurunan."
      >
        <GainScoreChart students={students} />
      </Block>

      {/* ---- Per Meeting by Model/Class ---- */}
      <Block
        title="Perkembangan antar Model Pembelajaran / Kelas"
        subtitle="Setiap garis mewakili satu model pembelajaran (atau kelas jika model belum diatur). Bandingkan tren rata-rata nilai tiap pertemuan."
      >
        <MeetingProgressChart students={students} byGroup height={300} />
      </Block>

      {/* ---- Per Student trajectory ---- */}
      <Block
        title="Perkembangan Setiap Peserta Didik"
        subtitle="Setiap garis mewakili satu siswa. Klik nama di legend untuk membandingkan."
      >
        {hasMeetings ? (
          <MeetingProgressChart students={students} perStudent height={340} />
        ) : (
          <PerStudentEmpty />
        )}
      </Block>

      {/* ---- Model effectiveness ---- */}
      <Block
        title="Efektivitas Model Pembelajaran"
        subtitle="Membandingkan rata-rata nilai dan persentase ketuntasan di tiga model: Co-op Co-op + AI, Co-op Co-op, dan Konvensional."
      >
        <ModelEffectivenessChart students={students} />
        <ModelInsight students={students} />
      </Block>
    </section>
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
    <div className="rounded-2xl border border-border bg-gradient-card p-5 shadow-card-soft">
      <h4 className="font-semibold text-foreground">{title}</h4>
      <p className="mb-4 text-xs text-muted-foreground">{subtitle}</p>
      {children}
    </div>
  );
}

function PerStudentEmpty() {
  return (
    <div className="grid h-[200px] place-items-center rounded-xl border border-dashed border-border px-6 text-center text-sm text-muted-foreground">
      Tambahkan data untuk minimal <strong>2 pertemuan</strong> berbeda untuk
      melihat trajektori tiap siswa.
    </div>
  );
}

/** Quick narrative under the model chart highlighting the best model. */
function ModelInsight({ students }: { students: Student[] }) {
  const insight = useMemo(() => {
    const valid = students.filter((s) => s.isValid && s.model);
    if (valid.length === 0) return null;
    const map = new Map<string, { sum: number; n: number; tuntas: number }>();
    for (const s of valid) {
      const key = s.model!;
      const cur = map.get(key) ?? { sum: 0, n: 0, tuntas: 0 };
      cur.sum += s.score;
      cur.n += 1;
      if (s.score >= 68) cur.tuntas += 1;
      map.set(key, cur);
    }
    const rows = Array.from(map.entries()).map(([name, v]) => ({
      name,
      avg: v.sum / v.n,
      pct: (v.tuntas / v.n) * 100,
    }));
    rows.sort((a, b) => b.avg - a.avg);
    return rows;
  }, [students]);

  if (!insight) return null;
  const best = insight[0];
  return (
    <p className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-foreground/85">
      Model paling efektif sejauh ini:{" "}
      <strong className="text-primary">{best.name}</strong> dengan rata-rata{" "}
      <strong>{best.avg.toFixed(1)}</strong> dan ketuntasan{" "}
      <strong>{best.pct.toFixed(0)}%</strong>.
    </p>
  );
}
