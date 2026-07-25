import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Uploader } from "@/components/Uploader";
import { ExcelUploader } from "@/components/ExcelUploader";
import { useStudentsCtx } from "@/context/StudentsContext";
import { parseOcrText } from "@/lib/parser";
import { toast } from "sonner";
import {
  UploadCloud,
  Sparkles,
  ShieldCheck,
  Tag,
  Camera,
  FileSpreadsheet,
  Layers,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Student, LearningModel } from "@/lib/types";
import { EXPERIMENT_CLASSES } from "@/lib/types";

/**
 * Upload page — dua metode input:
 * 1. Foto / OCR  → pengguna pilih jenis penilaian & kelas (manual)
 * 2. Excel / CSV → kelas & jenis penilaian dibaca OTOMATIS dari file
 */

type Category = "pretest" | "posttest" | `pertemuan-${number}`;

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: "pretest", label: "Pre-test" },
  ...Array.from({ length: 5 }, (_, i) => ({
    value: `pertemuan-${i + 1}` as Category,
    label: `Pertemuan ${i + 1}`,
  })),
  { value: "posttest", label: "Post-test" },
];

const NONE_CLASS = "__none__";

export default function Upload() {
  const { isReadOnly } = useAuth();
  if (isReadOnly) return <Navigate to="/peringkat-keseluruhan" replace />;

  const { appendStudents, stats } = useStudentsCtx();
  const navigate = useNavigate();

  // OCR-specific controls (manual)

  const [category, setCategory] = useState<Category>("pretest");
  const [experimentClass, setExperimentClass] = useState<string>(
    EXPERIMENT_CLASSES[0].label,
  );
  const [fallbackClass, setFallbackClass] = useState<string>("");

  const resolveClassMeta = (): { className?: string; model?: LearningModel } => {
    if (experimentClass === NONE_CLASS) {
      return { className: fallbackClass.trim() || undefined };
    }
    const preset = EXPERIMENT_CLASSES.find((c) => c.label === experimentClass);
    return { className: preset?.label, model: preset?.model };
  };

  const applyCategory = (s: Student): Student => {
    if (category === "pretest") return { ...s, kind: "pretest", pretest: s.score };
    if (category === "posttest") return { ...s, kind: "posttest", posttest: s.score };
    const n = Number(category.split("-")[1]);
    return { ...s, kind: "meeting", meeting: n };
  };

  /* ── OCR handler ── */
  const handleOcrExtracted = (text: string) => {
    const meta = resolveClassMeta();
    const parsed = parseOcrText(text, meta.className);
    if (parsed.length === 0) {
      toast.warning("Tidak menemukan baris 'Nama Nilai'. Coba tambah baris manual di tabel.");
      return;
    }
    const finalRows = parsed
      .map((s) => ({ ...s, className: meta.className ?? s.className, model: meta.model ?? s.model }))
      .map(applyCategory);
    appendStudents(finalRows);
    toast.success(
      `${finalRows.length} siswa ditambahkan (${CATEGORY_OPTIONS.find((c) => c.value === category)?.label}) via OCR`,
    );
    navigate("/peringkat-keseluruhan");
  };

  /* ── Excel handler (semua metadata sudah otomatis dari file) ── */
  const handleExcelParsed = (students: Student[]) => {
    if (students.length === 0) return;
    appendStudents(students);
    toast.success(`${students.length} records diimport dari Excel`);
    navigate("/peringkat-keseluruhan");
  };

  return (
    <section className="container mt-8 grid gap-10 lg:grid-cols-[1fr_1.25fr]">
      {/* ── Left: description ── */}
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
            Upload nilai{" "}
            <span className="text-gradient-primary">gambar atau Excel</span>
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-foreground/80 md:text-base">
            Pilih metode input yang sesuai — foto/scan nilai via{" "}
            <strong className="text-foreground">OCR</strong>, atau langsung dari
            file{" "}
            <strong className="text-foreground">Excel / CSV</strong> yang sudah
            disiapkan.
          </p>
        </div>

        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3">
            <Camera className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="text-foreground/85">
              <strong className="text-foreground">OCR Gambar</strong> — foto
              papan nilai atau scan daftar nilai diubah menjadi tabel. Pilih
              jenis penilaian dan kelas secara manual sebelum upload.
            </span>
          </li>
          <li className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3">
            <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span className="text-foreground/85">
              <strong className="text-foreground">Import Excel / CSV</strong> —
              kelas & model pembelajaran dibaca dari{" "}
              <strong className="text-foreground">nama sheet</strong>, jenis
              penilaian dibaca dari{" "}
              <strong className="text-foreground">
                baris header di atas kolom Nama/Nilai
              </strong>
              . Tidak perlu pilih apa-apa secara manual.
            </span>
          </li>
          <li className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3">
            <Layers className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span className="text-foreground/85">
              <strong className="text-foreground">Multi-sheet & multi-penilaian</strong>{" "}
              — satu file Excel bisa berisi banyak sheet (kelas) dan banyak
              jenis penilaian dalam satu baris, semuanya diimport sekaligus.
            </span>
          </li>
          <li className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span className="text-foreground/85">
              <strong className="text-foreground">Validasi otomatis</strong> —
              nilai di luar 0–100 atau nama kosong langsung ditandai sebelum
              diimport.
            </span>
          </li>
          <li className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="text-foreground/85">
              <strong className="text-foreground">Parsing fleksibel</strong> —
              format kolom case-insensitive, baris kosong dilewati, kolom tidak
              dikenal diabaikan.
            </span>
          </li>
        </ul>

        {stats.total > 0 && (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm text-foreground">
            Sudah ada{" "}
            <strong className="text-primary">{stats.total} records</strong> di
            dataset. Upload baru akan{" "}
            <strong className="text-foreground">ditambahkan</strong> ke daftar
            yang sudah ada.
          </div>
        )}
      </motion.div>

      {/* ── Right: tabs ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Tabs defaultValue="excel" className="w-full">
          <TabsList className="mb-5 w-full grid grid-cols-2">
            <TabsTrigger value="excel" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Excel / CSV
            </TabsTrigger>
            <TabsTrigger value="ocr" className="gap-2">
              <Camera className="h-4 w-4" />
              Foto / OCR
            </TabsTrigger>
          </TabsList>

          {/* ── Excel tab: tidak ada pilihan manual ── */}
          <TabsContent value="excel">
            <ExcelUploader onStudentsParsed={handleExcelParsed} />
          </TabsContent>

          {/* ── OCR tab: tetap ada pilihan jenis penilaian & kelas ── */}
          <TabsContent value="ocr" className="space-y-5">
            {/* Metadata for OCR */}
            <div className="grid gap-4 rounded-2xl border border-border/60 bg-card/40 p-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Jenis penilaian</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as Category)}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Diterapkan ke seluruh baris dari foto ini.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="experiment-class">Kelas penelitian</Label>
                <Select
                  value={experimentClass}
                  onValueChange={setExperimentClass}
                >
                  <SelectTrigger id="experiment-class">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIMENT_CLASSES.map((c) => (
                      <SelectItem key={c.label} value={c.label}>
                        {c.label} — {c.model}
                      </SelectItem>
                    ))}
                    <SelectItem value={NONE_CLASS}>Lainnya / manual</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Otomatis menetapkan model pembelajaran untuk semua baris.
                </p>
              </div>

              {experimentClass === NONE_CLASS && (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="fallback-class">Kelas (opsional)</Label>
                  <Input
                    id="fallback-class"
                    placeholder="cth. XII IPA 1"
                    value={fallbackClass}
                    onChange={(e) => setFallbackClass(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Dipakai jika gambar tidak mencantumkan kelas.
                  </p>
                </div>
              )}
            </div>

            <Uploader onTextExtracted={handleOcrExtracted} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </section>
  );
}
