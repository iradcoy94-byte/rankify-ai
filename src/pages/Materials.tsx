import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { ExtractedPdfPage } from "@/services/pdfService";
import { chunkMathContent } from "@/services/mathRagService";

type MaterialRow = { id: string; title: string; review_status: string; created_at: string };

export default function Materials() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [pages, setPages] = useState<ExtractedPdfPage[]>([]);
  const [progress, setProgress] = useState("");
  const [busy, setBusy] = useState(false);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);

  const loadMaterials = useCallback(async () => {
    const { data, error } = await supabase.from("learning_materials")
      .select("id,title,review_status,created_at").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setMaterials((data ?? []) as MaterialRow[]);
  }, []);

  useEffect(() => { void loadMaterials(); }, [loadMaterials]);

  const handleFile = async (nextFile: File | null) => {
    setFile(nextFile);
    setPages([]);
    setTitle(nextFile?.name.replace(/\.pdf$/i, "") ?? "");
    if (!nextFile) return;
    setBusy(true);
    try {
      const { extractPdf } = await import("@/services/pdfService");
      const extracted = await extractPdf(nextFile, (page, total) => setProgress(`Mengekstrak halaman ${page} dari ${total}...`));
      setPages(extracted);
      setProgress("");
      if (!extracted.some((page) => page.text.trim())) toast.warning("Teks tidak terdeteksi. Periksa kualitas scan PDF.");
      else toast.success(`${extracted.length} halaman siap ditinjau.`);
    } catch (error) {
      setFile(null);
      setProgress("");
      toast.error(error instanceof Error ? error.message : "Gagal mengekstrak PDF.");
    } finally {
      setBusy(false);
    }
  };

  const updatePage = (pageNumber: number, text: string) => setPages((current) => current.map((page) => page.page === pageNumber ? { ...page, text } : page));

  const saveMaterial = async () => {
    if (!user || !file || !title.trim() || pages.length === 0) return;
    if (!pages.some((page) => page.text.trim())) return toast.error("Isi atau koreksi teks hasil ekstraksi sebelum menyimpan.");
    setBusy(true);
    try {
      const materialId = crypto.randomUUID();
      const storagePath = `${user.schoolId}/${materialId}.pdf`;
      const { error: uploadError } = await supabase.storage.from("learning-materials").upload(storagePath, file, { contentType: "application/pdf", upsert: false });
      if (uploadError) throw uploadError;
      const { error: materialError } = await supabase.from("learning_materials").insert({
        id: materialId,
        school_id: user.schoolId,
        uploaded_by: user.id,
        title: title.trim(),
        storage_path: storagePath,
        review_status: "pending",
      });
      if (materialError) throw materialError;
      const chunks = pages.flatMap((page) => chunkMathContent(page.text).map((content) => ({
        material_id: materialId,
        school_id: user.schoolId,
        page_number: page.page,
        content,
      })));
      if (chunks.length === 0) throw new Error("Tidak ada teks materi yang dapat disimpan.");
      const { error: chunksError } = await supabase.from("learning_material_chunks").insert(chunks);
      if (chunksError) throw chunksError;
      const { error: approvalError } = await supabase.from("learning_materials").update({ review_status: "approved" }).eq("id", materialId);
      if (approvalError) throw approvalError;
      toast.success("Materi ditinjau dan diaktifkan untuk tutor.");
      setFile(null);
      setPages([]);
      setTitle("");
      await loadMaterials();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan materi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="container mt-8 max-w-4xl space-y-8 pb-12">
      <div>
        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-primary"><FileText className="h-3.5 w-3.5" /> Materi Tutor</span>
        <h2 className="text-3xl font-bold">Kelola materi matematika</h2>
        <p className="mt-2 text-sm text-muted-foreground">Unggah PDF, periksa ekstraksi teks dan OCR, lalu setujui agar materi dapat dipakai tutor. Foto soal dan percakapan siswa tidak disimpan.</p>
      </div>

      <div className="space-y-5 rounded-2xl border border-border bg-card/50 p-5">
        <div className="space-y-2"><Label htmlFor="material-title">Nama materi</Label><Input id="material-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Contoh: Persamaan Kuadrat" /></div>
        <div className="space-y-2"><Label htmlFor="material-file">File PDF (maksimal 25 MB)</Label><Input id="material-file" type="file" accept="application/pdf,.pdf" onChange={(event) => void handleFile(event.target.files?.[0] ?? null)} /></div>
        {busy && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{progress || "Menyimpan materi..."}</p>}
        {pages.length > 0 && <>
          <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs text-foreground"><ShieldCheck className="h-4 w-4 text-warning" />Periksa dan koreksi hasil ekstraksi tiap halaman sebelum mengaktifkan materi.</div>
          <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-2">
            {pages.map((page) => <div key={page.page} className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3">
              <div className="flex justify-between text-xs"><Label htmlFor={`page-${page.page}`}>Halaman {page.page}</Label><span className="text-muted-foreground">{page.extraction === "ocr" ? "OCR scan" : "Teks PDF"}</span></div>
              <Textarea id={`page-${page.page}`} value={page.text} onChange={(event) => updatePage(page.page, event.target.value)} rows={5} />
            </div>)}
          </div>
          <Button variant="hero" onClick={() => void saveMaterial()} disabled={busy || !title.trim()}><UploadCloud className="h-4 w-4" />Setujui dan aktifkan materi</Button>
        </>}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">Materi sekolah</h3>
        {materials.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada materi.</p> : materials.map((material) => <div key={material.id} className="flex items-center justify-between rounded-xl border border-border bg-card/40 px-4 py-3">
          <div><p className="font-medium">{material.title}</p><p className="text-xs text-muted-foreground">{new Date(material.created_at).toLocaleDateString("id-ID")}</p></div>
          <span className={`rounded-full px-2.5 py-1 text-xs ${material.review_status === "approved" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{material.review_status === "approved" ? "Aktif" : "Perlu ditinjau"}</span>
        </div>)}
      </div>
    </section>
  );
}
