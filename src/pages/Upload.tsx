import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Uploader } from "@/components/Uploader";
import { useStudentsCtx } from "@/context/StudentsContext";
import { parseOcrText } from "@/lib/parser";
import { toast } from "sonner";
import { UploadCloud, Sparkles, ShieldCheck } from "lucide-react";

/**
 * Upload page — dedicated screen for adding data via OCR or camera.
 * After successful OCR the user is redirected to overall ranking.
 */
export default function Upload() {
  const { appendStudents, stats } = useStudentsCtx();
  const navigate = useNavigate();

  const handleExtracted = (text: string) => {
    const parsed = parseOcrText(text);
    if (parsed.length === 0) {
      toast.warning(
        "Tidak menemukan baris 'Nama Nilai'. Coba tambah baris manual di tabel.",
      );
      return;
    }
    appendStudents(parsed);
    toast.success(`${parsed.length} siswa ditambahkan`);
    navigate("/peringkat-keseluruhan");
  };

  return (
    <section className="container mt-8 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div>
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs font-medium text-foreground/80 backdrop-blur">
            <UploadCloud className="h-3.5 w-3.5 text-primary" /> Tambah Data Nilai
          </span>
          <h2 className="text-balance text-4xl font-bold leading-tight md:text-5xl">
            Upload daftar nilai{" "}
            <span className="text-gradient-primary">sekali jepret</span>
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-foreground/80 md:text-base">
            Unggah foto papan nilai, scan dokumen, atau ambil langsung dengan
            kamera. OCR akan mengubahnya menjadi tabel ranking yang bisa kamu
            edit. Setiap upload baru <strong className="text-foreground">menambah</strong>{" "}
            data, bukan menggantikan — cocok untuk merekap banyak kelas.
          </p>
        </div>

        <ul className="space-y-3 text-sm text-foreground/85">
          <li className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Parsing fleksibel</strong> —
              mengenali kelas (VII–XII), nama, dan nilai meskipun format gambar
              berbeda-beda.
            </span>
          </li>
          <li className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span>
              <strong className="text-foreground">Validasi otomatis</strong> —
              nilai di luar rentang 0–100 atau nama kosong langsung ditandai
              merah supaya gampang diperbaiki.
            </span>
          </li>
          <li className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3">
            <UploadCloud className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>
              <strong className="text-foreground">Multi-sumber</strong> — drag &
              drop, pilih file, atau tangkap langsung dari kamera laptop /
              ponsel.
            </span>
          </li>
        </ul>

        {stats.total > 0 && (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm">
            Sudah ada{" "}
            <strong className="text-primary">{stats.total} siswa</strong> di
            dataset. Upload baru akan ditambahkan ke daftar yang sudah ada.
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Uploader onTextExtracted={handleExtracted} />
      </motion.div>
    </section>
  );
}
