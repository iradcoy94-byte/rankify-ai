import Tesseract from "tesseract.js";

/**
 * OCR service — wraps Tesseract.js so UI never imports it directly.
 * Uses Indonesian + English so common Indonesian names are recognised.
 *
 * @param file       Image file (jpg/png) selected by the user
 * @param onProgress Callback receiving a 0–100 integer
 * @returns Raw extracted text
 */
export async function runOcr(
  file: File,
  onProgress: (percent: number) => void,
): Promise<string> {
  const result = await Tesseract.recognize(file, "ind+eng", {
    logger: (m) => {
      // Tesseract emits various statuses; we only surface "recognizing text"
      if (m.status === "recognizing text") {
        onProgress(Math.round((m.progress ?? 0) * 100));
      }
    },
  });
  return result.data.text ?? "";
}
