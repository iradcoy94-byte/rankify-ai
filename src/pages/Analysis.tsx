import { AnalysisSection } from "@/components/AnalysisSection";
import { useStudentsCtx } from "@/context/StudentsContext";

/** Standalone analysis page. */
export default function Analysis() {
  const { students } = useStudentsCtx();
  return (
    <section className="container mt-8 space-y-6">
      <div>
        <h3 className="text-3xl font-bold">Analisis Peringkat Siswa</h3>
        <p className="text-sm text-muted-foreground">
          Insight ringkas: rata-rata, ketuntasan KKM (≥68), dan performa
          tertinggi tiap kelas.
        </p>
      </div>
      <AnalysisSection students={students} />
    </section>
  );
}
