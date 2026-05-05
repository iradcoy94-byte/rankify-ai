import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Uploader } from "@/components/Uploader";
import { useStudentsCtx } from "@/context/StudentsContext";
import { parseOcrText } from "@/lib/parser";
import { toast } from "sonner";
import { UploadCloud, Sparkles, ShieldCheck, Tag } from "lucide-react";
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
 * Upload page — dedicated screen for adding data via OCR or camera.
 * Before uploading, user picks a category (pretest / posttest / pertemuan 1..5)
 * and an experiment-class preset (which also auto-fills learning model).
 */

// Category options: pretest, pertemuan 1..5, posttest
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
  const { appendStudents, stats } = useStudentsCtx();
  const navigate = useNavigate();

  // User-controlled metadata applied to every row from this upload batch.
  const [category, setCategory] = useState<Category>("pretest");
  const [experimentClass, setExperimentClass] = useState<string>(EXPERIMENT_CLASSES[0].label);
  const [fallbackClass, setFallbackClass] = useState<string>("");

  /** Resolve the class label + model from the experiment-class selection. */
  const resolveClassMeta = (): { className?: string; model?: LearningModel } => {
    if (experimentClass === NONE_CLASS) {
      return { className: fallbackClass.trim() || undefined };
    }
    const preset = EXPERIMENT_CLASSES.find((c) => c.label === experimentClass);
    return { className: preset?.label, model: preset?.model };
  };

  /**
   * Apply the chosen category to a parsed student row:
   * - pretest  → kind=pretest, also mirror score into pretest field
   * - posttest → kind=posttest, mirror into posttest field
   * - pertemuan N → kind=meeting, set meeting=N
   */
  const applyCategory = (s: Student): Student => {
    if (category === "pretest") {
      return { ...s, kind: "pretest", pretest: s.score };
    }
    if (category === "posttest") {
      return { ...s, kind: "posttest", posttest: s.score };
    }
    const n = Number(category.split("-")[1]);
    return { ...s, kind: "meeting", meeting: n };
  };

  const handleExtracted = (text: string) => {
    const meta = resolveClassMeta();
    const parsed = parseOcrText(text, meta.className);
    if (parsed.length === 0) {
      toast.warning(
        "Tidak menemukan baris 'Nama Nilai'. Coba tambah baris manual di tabel.",
      );
      return;
    }
    // Force-apply class + model from preset onto every row (preset wins).
    const finalRows = parsed
      .map((s) => ({
        ...s,
        className: meta.className ?? s.className,
        model: meta.model ?? s.model,
      }))
      .map(applyCategory);
    appendStudents(finalRows);
    toast.success(
      `${finalRows.length} siswa ditambahkan (${
        CATEGORY_OPTIONS.find((c) => c.value === category)?.label
      })`,
    );
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
            Tentukan dulu <strong className="text-foreground">jenis penilaian</strong>{" "}
            dan (opsional) <strong className="text-foreground">kelas</strong>{" "}
            cadangan, lalu unggah foto/scan nilai. OCR akan mengubahnya menjadi
            tabel ranking yang bisa kamu edit.
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
              nilai di luar 0–100 atau nama kosong langsung ditandai.
            </span>
          </li>
          <li className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3">
            <Tag className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>
              <strong className="text-foreground">Metadata otomatis</strong> —
              kategori (pre-test / post-test / pertemuan) dan kelas cadangan
              akan diterapkan ke seluruh baris hasil OCR.
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
        className="space-y-5"
      >
        {/* Pre-upload metadata: category + class fallback */}
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
              Diterapkan ke seluruh baris dari upload ini.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="experiment-class">Kelas penelitian</Label>
            <Select value={experimentClass} onValueChange={setExperimentClass}>
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

        <Uploader onTextExtracted={handleExtracted} />
      </motion.div>
    </section>
  );
}
