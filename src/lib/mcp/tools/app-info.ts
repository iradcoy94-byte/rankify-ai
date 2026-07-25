import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

/**
 * Returns a description of the Rankify.AI app, its workflow, and how to use it.
 * Pure text tool — takes no user data.
 */
export default defineTool({
  name: "app_info",
  title: "Info aplikasi Rankify.AI",
  description:
    "Menjelaskan apa itu Rankify.AI, halaman-halaman yang tersedia, alur upload data, dan panduan pemakaian fitur.",
  inputSchema: {
    topic: z
      .enum([
        "overview",
        "upload",
        "ranking",
        "analysis",
        "n_gain",
        "classes",
        "all",
      ])
      .optional()
      .describe(
        "Topik yang ingin dijelaskan. 'all' mengembalikan panduan lengkap.",
      ),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: ({ topic }) => {
    const sections: Record<string, string> = {
      overview:
        "Rankify.AI adalah aplikasi untuk penelitian skripsi yang menentukan peringkat siswa berbasis nilai. Data bisa masuk lewat OCR foto/gambar daftar nilai atau input manual, lalu diranking otomatis (dense ranking). Aplikasi membandingkan tiga kelompok kelas: Eksperimen 1 (Co-op Co-op + AI), Eksperimen 2 (Co-op Co-op), dan Konvensional.",
      upload:
        "Halaman /upload menerima file gambar atau foto kamera daftar nilai. Sebelum menambahkan, pilih Jenis penilaian (Pre-test, Pertemuan 1-5, Post-test) dan Kelas Eksperimen (Eksperimen 1, Eksperimen 2, atau Konvensional). Hasil OCR bisa diedit manual karena OCR tidak selalu akurat.",
      ranking:
        "Halaman /peringkat-keseluruhan menampilkan dense ranking global lintas kelas untuk nilai pertemuan; halaman /peringkat-kelas memfilter per kelas. Kedua halaman punya tabel terpisah untuk Pre-test dan Post-test, dan filter per pertemuan. KKM = 68 (>=68 Tuntas, <68 Belum Tuntas).",
      analysis:
        "Halaman /analisis menampilkan: perbandingan Pre-test vs Post-test, grafik Gain Score, perkembangan nilai antar Model Pembelajaran / Kelas per pertemuan, trajektori individual, distribusi nilai, pie ketuntasan, dan uji N-Gain (Hake) untuk membandingkan efektivitas tiga model pembelajaran.",
      n_gain:
        "N-Gain Hake dihitung sebagai (post - pre) / (100 - pre) untuk tiap siswa dan dirata-ratakan per kelas. Kategori: tinggi >= 0.7, sedang 0.3-0.7, rendah < 0.3. Digunakan untuk membandingkan efektivitas Co-op Co-op + AI, Co-op Co-op, dan Konvensional.",
      classes:
        "Tiga kelompok penelitian: EKSP 1 (Co-op Co-op berbantuan AI), EKSP 2 (Co-op Co-op), KONV (Pembelajaran Konvensional).",
    };

    const pick = topic ?? "overview";
    const text =
      pick === "all"
        ? Object.entries(sections)
            .map(([k, v]) => `## ${k}\n${v}`)
            .join("\n\n")
        : sections[pick];

    return { content: [{ type: "text", text }] };
  },
});
