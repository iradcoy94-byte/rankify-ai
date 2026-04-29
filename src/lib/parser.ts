import { uid, validateStudent } from "./ranking";
import type { Student } from "./types";

/**
 * Flexible regex parser: extracts (name, score) pairs from raw OCR text.
 *
 * Supported separators between name and score:
 *   "Andi 90"          → space
 *   "Budi: 85"         → colon
 *   "Citra - 88"       → dash / hyphen
 *   "Dewi  =  72"      → equals
 *   "Eka | 95"         → pipe
 *   "Faiz\t80"         → tab
 *   "1. Gita 88"       → leading numbering ignored
 *
 * Score is the LAST number on the line within 0–100, so trailing notes don't
 * confuse the parser ("Hadi 88 tuntas" → Hadi, 88).
 */

const SEPARATOR = /[\s:=|\-–—\t]+/;
// Strip leading list numbering like "1.", "2)", "3 -"
const LEADING_NUM = /^\s*\d{1,3}\s*[\.\)]\s*/;

export function parseOcrText(raw: string): Student[] {
  if (!raw) return [];

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const students: Student[] = [];

  for (const original of lines) {
    const line = original.replace(LEADING_NUM, "");

    // Find ALL numbers in the line, pick the last one as the score
    const numberMatches = [...line.matchAll(/-?\d+(?:[.,]\d+)?/g)];
    if (numberMatches.length === 0) continue;

    const lastMatch = numberMatches[numberMatches.length - 1];
    const scoreStr = lastMatch[0].replace(",", ".");
    const score = Number(scoreStr);

    // Everything before the score = name (after stripping separators)
    const nameRaw = line.slice(0, lastMatch.index ?? 0);
    const name = nameRaw.replace(SEPARATOR, " ").trim().replace(/\s+/g, " ");

    if (!name) continue;

    const draft: Student = {
      id: uid(),
      name,
      score,
      rank: 0,
      isValid: true,
    };

    students.push(validateStudent(draft));
  }

  return students;
}
