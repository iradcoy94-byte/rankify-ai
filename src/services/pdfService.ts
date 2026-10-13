import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import Tesseract from "tesseract.js";

GlobalWorkerOptions.workerSrc = workerUrl;

export interface ExtractedPdfPage {
  page: number;
  text: string;
  extraction: "text" | "ocr";
}

async function recognizeCanvas(canvas: HTMLCanvasElement) {
  const result = await Tesseract.recognize(canvas, "ind+eng");
  return result.data.text?.trim() ?? "";
}

export async function extractPdf(file: File, onProgress: (page: number, total: number) => void): Promise<ExtractedPdfPage[]> {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Pilih dokumen PDF.");
  }
  if (file.size > 25 * 1024 * 1024) throw new Error("Ukuran PDF maksimal 25 MB.");
  const loadingTask = getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const pdf = await loadingTask.promise;
  const pages: ExtractedPdfPage[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => "str" in item ? item.str : "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length >= 20) {
      pages.push({ page: pageNumber, text, extraction: "text" });
    } else {
      const viewport = page.getViewport({ scale: 1.7 });
      const canvas = window.document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error(`Tidak dapat membaca halaman ${pageNumber}.`);
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      pages.push({ page: pageNumber, text: await recognizeCanvas(canvas), extraction: "ocr" });
    }
    onProgress(pageNumber, pdf.numPages);
  }
  await loadingTask.destroy();
  return pages;
}
