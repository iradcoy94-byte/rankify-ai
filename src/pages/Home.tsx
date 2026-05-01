import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";
import { Uploader } from "@/components/Uploader";
import { useStudentsCtx } from "@/context/StudentsContext";
import { parseOcrText } from "@/lib/parser";
import { toast } from "sonner";

/**
 * Home — landing page with hero copy and the uploader. After successful OCR
 * the user is taken to the overall ranking page.
 */
export default function Home() {
  const { appendStudents } = useStudentsCtx();
  const navigate = useNavigate();

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
    navigate("/peringkat-keseluruhan");
  };

  return (
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
  );
}
