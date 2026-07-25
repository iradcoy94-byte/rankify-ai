import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

/**
 * Analyze a list of math scores: distribution, KKM completeness (>=68),
 * average, and study recommendations.
 */
export default defineTool({
  name: "analyze_scores",
  title: "Analisis nilai matematika",
  description:
    "Menganalisis distribusi nilai matematika: rata-rata, min, max, median, ketuntasan KKM 68, dan rekomendasi belajar berdasarkan sebaran.",
  inputSchema: {
    scores: z
      .array(z.number())
      .describe("Daftar nilai siswa (0-100)."),
    kkm: z
      .number()
      .optional()
      .describe("Batas ketuntasan minimum. Default 68."),
    label: z
      .string()
      .optional()
      .describe("Label pengukuran (mis. 'Pre-test EKSP 1')."),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: ({ scores, kkm, label }) => {
    if (scores.length === 0) {
      return {
        content: [{ type: "text", text: "Daftar nilai kosong." }],
        isError: true,
      };
    }
    const threshold = kkm ?? 68;
    const sorted = [...scores].sort((a, b) => a - b);
    const n = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = sum / n;
    const min = sorted[0];
    const max = sorted[n - 1];
    const median =
      n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[(n - 1) / 2];
    const tuntas = sorted.filter((s) => s >= threshold).length;
    const belum = n - tuntas;
    const pctTuntas = (tuntas / n) * 100;

    const bucket = { "0-40": 0, "41-60": 0, "61-70": 0, "71-85": 0, "86-100": 0 };
    for (const s of sorted) {
      if (s <= 40) bucket["0-40"]++;
      else if (s <= 60) bucket["41-60"]++;
      else if (s <= 70) bucket["61-70"]++;
      else if (s <= 85) bucket["71-85"]++;
      else bucket["86-100"]++;
    }

    const recs: string[] = [];
    if (pctTuntas < 50) {
      recs.push(
        "Ketuntasan di bawah 50% — pertimbangkan remedial klasikal & review konsep dasar sebelum melanjutkan materi.",
      );
    } else if (pctTuntas < 80) {
      recs.push(
        "Ketuntasan sedang — fokus bimbingan untuk siswa di bawah KKM dan latihan soal bertingkat.",
      );
    } else {
      recs.push(
        "Ketuntasan tinggi — lanjutkan ke pengayaan / soal HOTS untuk kelompok atas.",
      );
    }
    if (max - min >= 50)
      recs.push(
        "Sebaran nilai lebar (>=50 poin) — pertimbangkan pembelajaran berdiferensiasi.",
      );
    if (bucket["0-40"] > 0)
      recs.push(
        `${bucket["0-40"]} siswa di rentang 0-40 memerlukan intervensi individual.`,
      );

    const summary = {
      label: label ?? null,
      n,
      average: Number(avg.toFixed(2)),
      median: Number(median.toFixed(2)),
      min,
      max,
      kkm: threshold,
      tuntas,
      belumTuntas: belum,
      percentTuntas: Number(pctTuntas.toFixed(1)),
      distribution: bucket,
      recommendations: recs,
    };

    const text =
      `${label ? label + " — " : ""}n=${n}, rata-rata ${avg.toFixed(2)}, ` +
      `median ${median.toFixed(2)}, min ${min}, max ${max}. ` +
      `Tuntas ${tuntas}/${n} (${pctTuntas.toFixed(1)}%) dengan KKM ${threshold}.\n\n` +
      "Rekomendasi:\n- " +
      recs.join("\n- ");

    return {
      content: [{ type: "text", text }],
      structuredContent: summary,
    };
  },
});
