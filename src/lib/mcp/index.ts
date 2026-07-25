import { defineMcp } from "@lovable.dev/mcp-js";
import appInfo from "./tools/app-info";
import computeRanking from "./tools/compute-ranking";
import analyzeScores from "./tools/analyze-scores";

/**
 * Rankify.AI MCP server (public — no auth).
 * Exposes stateless helpers: app guidance, ranking + N-Gain computation,
 * and math score analysis. Tools do not read app data.
 */
export default defineMcp({
  name: "rankify-ai-mcp",
  title: "Rankify.AI MCP",
  version: "0.1.0",
  instructions:
    "Tools untuk Rankify.AI — aplikasi ranking siswa & analisis efektivitas model pembelajaran (Co-op Co-op + AI, Co-op Co-op, Konvensional). Gunakan `app_info` untuk panduan aplikasi, `compute_ranking` untuk menghitung dense ranking dan N-Gain Hake dari daftar nilai, dan `analyze_scores` untuk analisis distribusi & ketuntasan nilai matematika (KKM 68).",
  tools: [appInfo, computeRanking, analyzeScores],
});
