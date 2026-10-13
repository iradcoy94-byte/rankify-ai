import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, FileSpreadsheet, GraduationCap, Sparkles, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudentsCtx } from "@/context/StudentsContext";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { stats, classes, isSyncing } = useStudentsCtx();
  const { session } = useAuth();
  const features = [
    { icon: FileSpreadsheet, title: "Input dan verifikasi nilai", desc: "Impor nilai dari OCR atau Excel/CSV, lalu cocokkan dengan roster siswa." },
    { icon: Trophy, title: "Peringkat yang jelas", desc: "Lihat posisi peserta didik per kelas atau gabungan kelas." },
    { icon: BarChart3, title: "Analisis penelitian", desc: "Pantau pre-test, post-test, N-Gain, dan perkembangan tiap pertemuan." },
    { icon: Sparkles, title: "Tutor matematika", desc: "Bantu siswa memahami soal melalui penjelasan bertahap berbasis materi." },
  ];

  return <div className="container space-y-12 pt-8 pb-16">
    <section className="grid gap-8 rounded-3xl border border-border bg-gradient-card p-7 shadow-card-soft md:grid-cols-[1.3fr_0.7fr] md:items-center md:p-10">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"><GraduationCap className="h-3.5 w-3.5" />Ruang kerja Rankify.AI</span>
        <h2 className="mt-4 max-w-2xl text-4xl font-bold leading-tight md:text-5xl">Olah nilai, baca perkembangan, dan bantu siswa belajar.</h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">Selamat datang{session?.name ? `, ${session.name}` : ""}. Gunakan satu ruang kerja untuk mengelola data asesmen dan melihat hasil belajar yang terverifikasi.</p>
        <div className="mt-6 flex flex-wrap gap-3"><Button asChild variant="hero"><Link to="/upload">Input nilai <ArrowRight className="h-4 w-4" /></Link></Button><Button asChild variant="outline"><Link to="/peringkat-keseluruhan">Lihat hasil</Link></Button></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Summary label="Record nilai" value={isSyncing ? "…" : stats.total} icon={FileSpreadsheet} />
        <Summary label="Valid" value={isSyncing ? "…" : stats.valid} icon={Trophy} />
        <Summary label="Rata-rata" value={isSyncing ? "…" : stats.avg} icon={BarChart3} />
        <Summary label="Kelas aktif" value={classes.length} icon={Users} />
      </div>
    </section>
    <section>
      <div className="max-w-2xl"><h3 className="text-2xl font-bold">Fitur utama</h3><p className="mt-1 text-sm text-muted-foreground">Alur dari data asesmen hingga tindak lanjut belajar.</p></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{features.map(({ icon: Icon, title, desc }) => <article key={title} className="rounded-2xl border border-border bg-card/60 p-5"><div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div><h4 className="font-semibold">{title}</h4><p className="mt-2 text-sm leading-5 text-muted-foreground">{desc}</p></article>)}</div>
    </section>
  </div>;
}

function Summary({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Users }) {
  return <div className="rounded-2xl border border-border bg-background/70 p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4 text-primary" />{label}</div><p className="mt-2 text-2xl font-bold">{value}</p></div>;
}
