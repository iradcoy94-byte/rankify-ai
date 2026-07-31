import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Trophy,
  GraduationCap,
  BarChart3,
  BookOpen,
  Globe,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Home — informative landing page.
 * Sections:
 *   1. Hero & product description
 *   2. Cards summarising the website's capabilities
 *   3. Education in Indonesia (trusted studies)
 *   4. Math literacy (OECD / PISA)
 *   5. CTA
 */
export default function Home() {
  return (
    <div className="container space-y-20 pt-6 pb-16 lg:pt-12">
      {/* ---------------- HERO ---------------- */}
      <section className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-xs font-medium text-foreground/85 backdrop-blur">
            <Trophy className="h-3.5 w-3.5 text-primary" />
            Ranking siswa otomatis dalam 3 langkah
          </span>
          <h2 className="text-balance text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Ruang kerja Guru untuk{" "}
            <span className="text-gradient-primary">olah data nilai.</span>
          </h2>
          <p className="mt-5 max-w-xl text-justify text-sm leading-relaxed text-foreground/85 md:text-base">
            <strong className="text-foreground">Rankify.AI</strong> adalah
            platform berbasis web untuk membantu guru menginput data nilai,
            mengubah gambar daftar nilai menjadi tabel digital lewat{" "}
            <em>OCR</em>, memvalidasi data, lalu melihat hasil peringkat dan
            perkembangan peserta didik dari pertemuan ke pertemuan.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild variant="hero" size="lg">
              <Link to="/upload">
                Input Data <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/peringkat-keseluruhan">Lihat Hasil</Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative grid grid-cols-2 gap-4"
        >
          <FeatureBubble
            icon={<Sparkles className="h-5 w-5" />}
            title="OCR Otomatis"
            desc="Foto daftar nilai diubah menjadi tabel yang bisa dicek guru."
          />
          <FeatureBubble
            icon={<BarChart3 className="h-5 w-5" />}
            title="Pantau Perkembangan"
            desc="Pretest, posttest, gain score, dan tren nilai per pertemuan."
          />
          <FeatureBubble
            icon={<Trophy className="h-5 w-5" />}
            title="Hasil Peringkat"
            desc="Peringkat per kelas dan keseluruhan dari data yang tersedia."
          />
          <FeatureBubble
            icon={<GraduationCap className="h-5 w-5" />}
            title="AI Assistant"
            desc="Bantu guru membaca pola capaian dan kebutuhan belajar siswa."
          />
        </motion.div>
      </section>

      {/* ---------------- EDUCATION IN INDONESIA ---------------- */}
      <section>
        <SectionHeader
          icon={<BookOpen className="h-4 w-4" />}
          eyebrow="Konteks Pendidikan"
          title="Pendidikan di Indonesia hari ini"
          subtitle="Ringkasan studi terpercaya yang melatarbelakangi pentingnya alat bantu evaluasi seperti Rankify.AI."
        />
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <StudyCard
            source="Kemendikbudristek (Rapor Pendidikan 2023)"
            stat="≈ 50%"
            text="siswa Indonesia masih berada di bawah kompetensi minimum literasi dan numerasi pada jenjang pendidikan dasar dan menengah."
          />
          <StudyCard
            source="Bank Dunia — Indonesia Education Report (2020)"
            stat="≈ 53%"
            text="anak usia 10 tahun mengalami learning poverty: tidak mampu membaca dan memahami teks sederhana sesuai usianya."
          />
          <StudyCard
            source="UNICEF Indonesia (2022)"
            stat="2 dari 3"
            text="guru menyatakan butuh dukungan tambahan dalam asesmen formatif untuk mengidentifikasi siswa yang tertinggal."
          />
        </div>
      </section>

      {/* ---------------- MATH OECD / PISA ---------------- */}
      <section>
        <SectionHeader
          icon={<Globe className="h-4 w-4" />}
          eyebrow="OECD · PISA 2022"
          title="Matematika: cermin kemampuan berpikir"
          subtitle="Data OECD memperlihatkan kesenjangan kemampuan matematika antara siswa Indonesia dengan rata-rata negara OECD."
        />
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <StatBigCard
            label="Skor matematika Indonesia"
            value="366"
            note="OECD rata-rata: 472 (PISA 2022)"
            tone="destructive"
          />
          <StatBigCard
            label="Peringkat dunia"
            value="69 / 81"
            note="negara peserta PISA 2022"
            tone="warning"
          />
          <StatBigCard
            label="Siswa di bawah Level 2"
            value="≈ 75%"
            note="belum menguasai numerasi dasar"
            tone="destructive"
          />
          <StatBigCard
            label="Siswa di Level 5–6"
            value="< 1%"
            note="kategori berpikir matematis tinggi"
            tone="primary"
          />
        </div>
        <p className="mt-6 text-justify text-sm leading-relaxed text-foreground/80">
          Studi OECD melalui asesmen <strong>PISA 2022</strong> menunjukkan
          bahwa kemampuan matematika siswa Indonesia mengalami penurunan
          signifikan dibanding 2018, sebagian akibat <em>learning loss</em>{" "}
          masa pandemi. Sebagian besar siswa belum mencapai{" "}
          <strong>Level 2</strong> — level minimum untuk memecahkan masalah
          matematis sederhana. Hal ini menegaskan pentingnya{" "}
          <strong>asesmen yang cepat, akurat, dan reflektif</strong> agar guru
          dapat memetakan kemampuan tiap siswa, mengevaluasi efektivitas model
          pembelajaran, serta merancang intervensi yang tepat sasaran.
        </p>
      </section>
    </div>
  );
}

/* ---------- helpers ---------- */

function FeatureBubble({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-card p-4 shadow-card-soft">
      <div className="mb-2 inline-grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant">
        {icon}
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-foreground/75">{desc}</p>
    </div>
  );
}

function SectionHeader({
  icon,
  eyebrow,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="max-w-3xl">
      <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
        {icon} {eyebrow}
      </span>
      <h3 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-foreground/80 md:text-base">
        {subtitle}
      </p>
    </div>
  );
}

function StudyCard({
  source,
  stat,
  text,
}: {
  source: string;
  stat: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-card p-5 shadow-card-soft">
      <p className="text-xs uppercase tracking-wide text-primary">{source}</p>
      <p className="my-2 text-3xl font-bold text-gradient-primary">{stat}</p>
      <p className="text-sm leading-relaxed text-foreground/85">{text}</p>
    </div>
  );
}

function StatBigCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone: "primary" | "warning" | "destructive";
}) {
  const toneClass =
    tone === "destructive"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning"
        : "text-primary";
  return (
    <div className="rounded-2xl border border-border bg-gradient-card p-5 shadow-card-soft">
      <p className="text-[11px] uppercase tracking-wide text-foreground/70">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs text-foreground/75">{note}</p>
    </div>
  );
}
