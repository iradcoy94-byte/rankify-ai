import { useMemo, useState } from "react";
import { Download, FileUp } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import type { Student } from "@/lib/types";
import { parseMySqlStudentsDump } from "@/services/legacyImportService";
import { validateStudent } from "@/lib/ranking";

const LEGACY_KEY = "rankify.students.shared.v1";

export function LegacyDataMigration({ onImport }: { onImport: (rows: Student[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [stagedRows, setStagedRows] = useState<Student[]>([]);
  const hasLocalRows = useMemo(() => {
    try {
      const value = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "null");
      return Array.isArray(value) && value.length > 0;
    } catch { return false; }
  }, []);

  const exportLocalRows = () => {
    try {
      const rows = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "[]");
      if (!Array.isArray(rows) || rows.length === 0) return toast.info("Tidak ada data lokal lama di browser ini.");
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), students: rows }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "rankify-local-storage-export.json";
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${rows.length} baris lama diekspor. Impor file ini pada versi Supabase.`);
    } catch { toast.error("Data lokal lama tidak dapat diekspor."); }
  };

  const importLegacyFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      let rows: unknown[];
      if (file.name.toLowerCase().endsWith(".sql")) {
        rows = parseMySqlStudentsDump(await file.text());
      } else if (file.name.toLowerCase().endsWith(".csv")) {
        const workbook = XLSX.read(await file.text(), { type: "string" });
        rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: null });
      } else {
        const parsed = JSON.parse(await file.text());
        rows = Array.isArray(parsed) ? parsed : parsed.students;
      }
      if (!Array.isArray(rows)) throw new Error("File tidak berisi daftar nilai.");
      const cleaned = rows
        .filter((value): value is Record<string, unknown> => !!value && typeof value === "object" && typeof (value as Record<string, unknown>).name === "string")
        .flatMap((row) => {
          const score = row.score == null || row.score === "" ? Number.NaN : Number(row.score);
          const pretest = row.pretest == null || row.pretest === "" ? undefined : Number(row.pretest);
          const posttest = row.posttest == null || row.posttest === "" ? undefined : Number(row.posttest);
          const originalKind = row.kind === "pretest" || row.kind === "posttest" ? row.kind : "meeting";
          const common = {
            ...row,
            name: String(row.name ?? "").trim(),
            id: crypto.randomUUID(),
            meeting: Number(row.meeting) || undefined,
            pretest,
            posttest,
            nisn: row.nisn == null ? undefined : String(row.nisn).trim(),
            rank: 0,
            isValid: true,
            className: String(row.className ?? row.class_name ?? "").trim(),
            model: row.model as Student["model"],
          };
          const converted: Student[] = [];
          if (Number.isFinite(score)) converted.push({ ...common, score, kind: originalKind });
          if (Number.isFinite(pretest) && originalKind !== "pretest") converted.push({ ...common, id: crypto.randomUUID(), score: pretest!, kind: "pretest", pretest });
          if (Number.isFinite(posttest) && originalKind !== "posttest") converted.push({ ...common, id: crypto.randomUUID(), score: posttest!, kind: "posttest", posttest });
          if (!converted.length && Number.isFinite(pretest)) converted.push({ ...common, score: pretest!, kind: "pretest" });
          if (!converted.length && Number.isFinite(posttest)) converted.push({ ...common, score: posttest!, kind: "posttest" });
          return converted;
        });
      if (cleaned.length === 0) throw new Error("Tidak ada baris nilai yang dapat diimpor.");
      setStagedRows(cleaned);
      toast.success(`${cleaned.length} baris siap ditinjau sebelum disimpan.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "File migrasi tidak valid.");
    } finally { setBusy(false); }
  };

  const commitImport = () => {
    const valid = stagedRows.map(validateStudent).filter((row) => row.isValid);
    if (valid.length === 0) return toast.error("Tidak ada baris dengan nama dan nilai valid.");
    onImport(valid);
    setStagedRows([]);
  };

  return <div className="space-y-3 rounded-xl border border-dashed border-border bg-card/30 p-4">
    <div><h3 className="text-sm font-semibold">Migrasi data lama</h3><p className="mt-1 text-xs text-muted-foreground">Ekspor data browser lama sebagai JSON, atau unggah CSV ekspor tabel students MySQL. Data dicocokkan dengan roster memakai NISN atau nama/kelas; baris yang belum cocok masuk karantina.</p></div>
    <div className="flex flex-wrap gap-2">
      {hasLocalRows && <Button type="button" variant="outline" size="sm" onClick={exportLocalRows}><Download className="h-4 w-4" />Ekspor data browser ini</Button>}
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-secondary"><FileUp className="h-4 w-4" />{busy ? "Membaca..." : "Impor JSON, CSV, atau dump SQL MySQL"}<input type="file" accept="application/json,.json,text/csv,.csv,.sql,text/plain" className="sr-only" disabled={busy} onChange={(event) => { void importLegacyFile(event.target.files?.[0]); event.target.value = ""; }} /></label>
    </div>
    {stagedRows.length > 0 && <div className="space-y-3 rounded-lg border border-border bg-background/70 p-3"><div><p className="text-sm font-semibold">Pratinjau migrasi ({stagedRows.length} baris)</p><p className="text-xs text-muted-foreground">Periksa nama, kelas, jenis asesmen, dan nilai. Baris tanpa nama atau nilai valid tidak akan disimpan.</p></div><div className="max-h-56 overflow-auto"><table className="w-full text-xs"><thead className="sticky top-0 bg-secondary"><tr><th className="p-2 text-left">Nama / NISN</th><th className="p-2 text-left">Kelas</th><th className="p-2 text-left">Asesmen</th><th className="p-2 text-left">Nilai</th><th className="p-2 text-left">Validasi</th></tr></thead><tbody>{stagedRows.map((row, index) => { const checked = validateStudent(row); return <tr key={`${row.id}-${index}`} className="border-t border-border/60"><td className="p-2">{row.name}{row.nisn ? ` · ${row.nisn}` : ""}</td><td className="p-2">{row.className || "—"}</td><td className="p-2">{row.kind === "meeting" ? `P${row.meeting ?? 1}` : row.kind}</td><td className="p-2"><input aria-label={`Nilai baris ${index + 1}`} type="number" min={0} max={100} value={Number.isFinite(row.score) ? row.score : ""} onChange={(event) => setStagedRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, score: event.target.value === "" ? Number.NaN : Number(event.target.value) } : item))} className="w-20 rounded border border-input bg-background px-2 py-1" /></td><td className={`p-2 ${checked.isValid ? "text-success" : "text-destructive"}`}>{checked.isValid ? "Valid" : checked.error}</td></tr>; })}</tbody></table></div><div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setStagedRows([])}>Batal</Button><Button type="button" size="sm" onClick={commitImport}>Cocokkan dan impor baris valid</Button></div></div>}
  </div>;
}
