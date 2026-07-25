import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

/**
 * Compute dense ranking + N-Gain from provided scores.
 * Pure computation — no access to app data.
 */
export default defineTool({
  name: "compute_ranking",
  title: "Kalkulasi ranking & N-Gain",
  description:
    "Menghitung dense ranking dari daftar nilai siswa, dan opsional skor N-Gain Hake dari pretest/posttest. Murni komputasi, tidak mengakses data aplikasi.",
  inputSchema: {
    students: z
      .array(
        z.object({
          name: z.string().describe("Nama siswa"),
          score: z.number().describe("Nilai untuk peringkat (0-100)"),
          pretest: z.number().optional().describe("Nilai pretest (opsional)"),
          posttest: z.number().optional().describe("Nilai posttest (opsional)"),
          className: z.string().optional(),
        }),
      )
      .describe("Daftar siswa dengan nilai."),
    mode: z
      .enum(["global", "per_class"])
      .optional()
      .describe(
        "Cara ranking. 'global' = dense ranking lintas kelas, 'per_class' = per className. Default: global.",
      ),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: ({ students, mode }) => {
    const useMode = mode ?? "global";

    const rankGroup = (list: typeof students) => {
      const sorted = [...list].sort((a, b) => b.score - a.score);
      let rank = 0;
      let last: number | null = null;
      return sorted.map((s) => {
        if (last === null || s.score !== last) {
          rank += 1;
          last = s.score;
        }
        return { ...s, rank };
      });
    };

    let ranked: Array<(typeof students)[number] & { rank: number }> = [];
    if (useMode === "per_class") {
      const groups = new Map<string, typeof students>();
      for (const s of students) {
        const k = s.className ?? "—";
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(s);
      }
      for (const list of groups.values()) ranked.push(...rankGroup(list));
    } else {
      ranked = rankGroup(students);
    }

    // N-Gain per student
    const withGain = ranked.map((s) => {
      if (s.pretest !== undefined && s.posttest !== undefined) {
        const denom = 100 - s.pretest;
        const ng = denom > 0 ? (s.posttest - s.pretest) / denom : 0;
        return { ...s, nGain: Number(ng.toFixed(3)) };
      }
      return s;
    });

    const gains = withGain
      .map((s) => (s as { nGain?: number }).nGain)
      .filter((v): v is number => typeof v === "number");
    const avgNGain =
      gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / gains.length : null;
    const category =
      avgNGain === null
        ? null
        : avgNGain >= 0.7
          ? "tinggi"
          : avgNGain >= 0.3
            ? "sedang"
            : "rendah";

    const summary = {
      count: withGain.length,
      mode: useMode,
      averageNGain: avgNGain === null ? null : Number(avgNGain.toFixed(3)),
      nGainCategory: category,
    };

    return {
      content: [
        {
          type: "text",
          text:
            `Ranked ${withGain.length} siswa (${useMode}).` +
            (avgNGain !== null
              ? ` Rata-rata N-Gain: ${avgNGain.toFixed(3)} (${category}).`
              : ""),
        },
      ],
      structuredContent: { summary, ranked: withGain },
    };
  },
});
