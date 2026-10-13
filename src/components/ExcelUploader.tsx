/**
 * ExcelUploader.tsx
 *
 * Drag & drop komponen untuk file Excel / CSV.
 *
 * Semua metadata (kelas, model pembelajaran, jenis penilaian) dibaca
 * OTOMATIS dari file — nama sheet → kelas & model, baris header → jenis
 * penilaian. Tidak ada pilihan manual yang perlu diisi pengguna.
 */
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileSpreadsheet,
  UploadCloud,
  Loader2,
  X,
  CheckCircle2,
  AlertTriangle,
  Table2,
  Layers,
  Tag,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { parseExcelFile, type ExcelParseResult } from "@/services/excelService";
import type { Student } from "@/lib/types";

interface ExcelUploaderProps {
  /** Called with parsed students when user clicks "Import". */
  onStudentsParsed: (students: Student[]) => void | Promise<void>;
}

const ACCEPTED_TYPES = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
  "text/csv": [".csv"],
  "text/plain": [".csv"],
};

// Urutan tampilan section di summary
const SECTION_ORDER = ["Pre-test", "Pertemuan 1", "Pertemuan 2", "Pertemuan 3", "Pertemuan 4", "Pertemuan 5", "Post-test"];

export function ExcelUploader({ onStudentsParsed }: ExcelUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ExcelParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const processFile = useCallback(async (f: File) => {
    setFile(f);
    setResult(null);
    setIsParsing(true);
    try {
      const parsed = await parseExcelFile(f);
      setResult(parsed);
      if (parsed.students.length === 0) {
        toast.warning("Tidak ada data siswa yang terbaca dari file ini.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal membaca file. Pastikan format Excel/CSV sesuai.");
      setFile(null);
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (accepted: File[]) => { if (accepted[0]) processFile(accepted[0]); },
    [processFile],
  );

  const { getRootProps, getInputProps, isDragActive, open: openPicker } =
    useDropzone({
      onDrop: handleDrop,
      accept: ACCEPTED_TYPES,
      multiple: false,
      disabled: isParsing || isImporting,
      noClick: false,
    });

  const handleClear = () => { setFile(null); setResult(null); };

  const handleConfirm = async () => {
    if (!result || result.students.length === 0 || isImporting) return;
    setIsImporting(true);
    try {
      await onStudentsParsed(result.students);
    } catch {
      toast.error("Gagal menyimpan data. Silakan coba lagi.");
    } finally {
      setIsImporting(false);
    }
  };

  // Derived display data
  const previewStudents = result?.students.slice(0, 10) ?? [];
  const totalValid   = result?.students.filter((s) => s.isValid).length ?? 0;
  const totalInvalid = (result?.students.length ?? 0) - totalValid;

  // Summary: per sheet
  const sheetSummary = result
    ? result.sheetNames.map((sn) => {
        const rows = result.students.filter((s) => s.className === sn);
        return { name: sn, count: rows.length };
      })
    : [];

  // Sorted sections for display
  const sectionsDisplay = result
    ? [...result.sectionsFound].sort(
        (a, b) => SECTION_ORDER.indexOf(a) - SECTION_ORDER.indexOf(b),
      )
    : [];

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {/* ── DROPZONE ── */}
        {!file ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            <div
              {...getRootProps()}
              className={`group relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-smooth ${
                isDragActive
                  ? "border-primary bg-primary/5 shadow-glow"
                  : "border-border bg-card/40 hover:border-primary/60 hover:bg-card/70"
              }`}
            >
              <input {...getInputProps()} />
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-elegant">
                <FileSpreadsheet className="h-7 w-7 text-white" />
              </div>
              <p className="mb-1 text-lg font-semibold">
                {isDragActive ? "Lepaskan File Di Sini" : "Drag & Drop File Excel / CSV"}
              </p>
              <p className="text-sm text-muted-foreground">
                Format: <strong className="text-foreground">.xlsx</strong>,{" "}
                <strong className="text-foreground">.xls</strong>,{" "}
                <strong className="text-foreground">.csv</strong>
              </p>
            </div>

            <Button type="button" variant="outline" size="lg" onClick={openPicker} className="w-full">
              <FileSpreadsheet className="h-4 w-4" /> Pilih File Excel
            </Button>

            {/* Format guide */}
            <div className="rounded-xl border border-border/60 bg-card/30 p-4 space-y-3">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Table2 className="h-3.5 w-3.5 text-primary" />
                Format yang otomatis dikenali:
              </p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Layers className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>
                    <strong className="text-foreground">Nama Sheet</strong> →
                    otomatis jadi <em>Kelas</em> &{" "}
                    <em>Model Pembelajaran</em>.{" "}
                    <span className="font-mono text-primary">Konvensional</span>,{" "}
                    <span className="font-mono text-primary">Eksperimen 1</span>,{" "}
                    <span className="font-mono text-primary">Eksperimen 2</span>
                    {" "}dikenali langsung.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Tag className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
                  <span>
                    <strong className="text-foreground">Baris jenis penilaian</strong>{" "}
                    (di atas kolom Nama/Nilai) →{" "}
                    <span className="font-mono text-primary">pre-test</span>,{" "}
                    <span className="font-mono text-primary">pertemuan 1</span>,{" "}
                    …,{" "}
                    <span className="font-mono text-primary">post-test</span>{" "}
                    otomatis dikenali dan dijadikan jenis penilaian.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <span>
                    <strong className="text-foreground">Kolom NISN, Nama & Nilai</strong>{" "}
                    bisa berulang secara horizontal. NISN membantu pencocokan; jika tidak tersedia, sistem mencocokkan nama dan kelas.
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ── PREVIEW & CONFIRM ── */
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            {/* File info bar */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-card/60 px-4 py-2.5">
              <div className="flex items-center gap-2 text-sm min-w-0">
                <FileSpreadsheet className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="truncate font-medium">{file.name}</span>
                <span className="text-muted-foreground text-xs shrink-0">
                  ({(file.size / 1024).toFixed(0)} KB)
                </span>
              </div>
              {!isParsing && !isImporting && (
                <button
                  onClick={handleClear}
                  className="ml-2 rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-smooth shrink-0"
                  aria-label="Hapus file"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Loading */}
            {isParsing && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card/40 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Membaca file Excel dan mendeteksi kolom…
              </div>
            )}

            {/* Result */}
            {!isParsing && result && (
              <>
                {/* Warnings */}
                {result.warnings.length > 0 && (
                  <div className="space-y-1.5">
                    {result.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-foreground">
                        <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                        {w}
                      </div>
                    ))}
                  </div>
                )}

                {/* Detected metadata chips */}
                <div className="rounded-xl border border-border/60 bg-secondary/20 p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground">Terdeteksi otomatis:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {/* Sheets */}
                    {sheetSummary.map((s) => (
                      <span key={s.name} className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                        <Layers className="h-3 w-3" />
                        {s.name} ({s.count} baris)
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {/* Sections */}
                    {sectionsDisplay.map((sec) => (
                      <span key={sec} className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        <Tag className="h-3 w-3" />
                        {sec}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-secondary px-3 py-1 font-mono text-foreground">
                    Total baris: <strong>{result.rawRowCount}</strong>
                  </span>
                  <span className="rounded-full bg-secondary px-3 py-1 font-mono text-foreground">
                    Records: <strong>{result.students.length}</strong>
                  </span>
                  <span className="rounded-full bg-success/10 px-3 py-1 font-mono text-success">
                    <CheckCircle2 className="inline h-3.5 w-3.5 mr-1" />
                    Valid: <strong>{totalValid}</strong>
                  </span>
                  {totalInvalid > 0 && (
                    <span className="rounded-full bg-destructive/10 px-3 py-1 font-mono text-destructive">
                      <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
                      Invalid: <strong>{totalInvalid}</strong>
                    </span>
                  )}
                </div>

                {/* Preview table */}
                {previewStudents.length > 0 && (
                  <div className="rounded-2xl border border-border overflow-hidden">
                    <div className="border-b border-border bg-secondary/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Preview — {previewStudents.length} dari {result.students.length} records
                    </div>
                    <ScrollArea className="max-h-52">
                      <table className="w-full text-xs">
                        <thead className="bg-secondary/20 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">NISN</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nama</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Kelas / Sheet</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Jenis</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nilai</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewStudents.map((s) => {
                            const jenisLabel =
                              s.kind === "pretest"
                                ? "Pre-test"
                                : s.kind === "posttest"
                                  ? "Post-test"
                                  : `Pertemuan ${s.meeting ?? "?"}`;
                            return (
                              <tr key={s.id} className="border-t border-border/50 hover:bg-secondary/20">
                                <td className="px-3 py-1.5 font-mono text-muted-foreground">{s.nisn ?? "—"}</td>
                                <td className="px-3 py-1.5 font-medium">{s.name}</td>
                                <td className="px-3 py-1.5 text-muted-foreground">{s.className ?? "—"}</td>
                                <td className="px-3 py-1.5">
                                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                    s.kind === "pretest"
                                      ? "bg-blue-500/10 text-blue-400"
                                      : s.kind === "posttest"
                                        ? "bg-purple-500/10 text-purple-400"
                                        : "bg-primary/10 text-primary"
                                  }`}>
                                    {jenisLabel}
                                  </span>
                                </td>
                                <td className="px-3 py-1.5 font-mono">{isNaN(s.score) ? "—" : s.score}</td>
                                <td className="px-3 py-1.5">
                                  {s.isValid
                                    ? <span className="text-success">✓ Valid</span>
                                    : <span className="text-destructive" title={s.error}>✗ {s.error}</span>
                                  }
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleClear} disabled={isParsing || isImporting}>
                    Ganti File
                  </Button>
                  <Button
                    variant="hero"
                    size="sm"
                    onClick={handleConfirm}
                    disabled={result.students.length === 0 || isImporting}
                    className="flex-1"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isImporting ? "Menyimpan…" : `Import ${result.students.length} Records`}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
