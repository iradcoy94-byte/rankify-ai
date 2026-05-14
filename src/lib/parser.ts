import { uid, validateStudent } from "./ranking";
import type { Student } from "./types";

/**
 * Flexible regex parser: extracts (className?, name, score) tuples from raw OCR text.
 *
 * Supported separators between name and score:
 *   "Andi 90", "Budi: 85", "Citra - 88", "Dewi = 72", "Eka | 95", "Faiz\t80"
 *   "1. Gita 88" → leading numbering ignored
 *
 * Class detection (smart): a header line such as
 *   "Kelas: XII IPA 1", "XII IPA 1", "X-IPA-2", "Kelas 9A"
 * sets the active class for the rows that follow. Tokens that look like a
 * class label (Roman numeral VII–XII, or X|XI|XII followed by IPA/IPS/MIPA/A-Z/digits)
 * appearing inline before the name are also stripped from the name and
 * promoted to the row's class — so "XII Andi 90" becomes
 * { className: "XII", name: "Andi", score: 90 }.
 *
 * Score is the LAST number on the line within 0–100 so trailing notes don't
 * confuse the parser ("Hadi 88 tuntas" → Hadi, 88).
 */

const SEPARATOR = /[\s:=|\-–—\t]+/;
// Strip leading list numbering like "1.", "2)", "3 -"
const LEADING_NUM = /^\s*\d{1,3}\s*[.)]\s*/;

// Roman numerals commonly used for SMP/SMA classes
const ROMAN = "(?:VII|VIII|IX|X|XI|XII)";
// e.g. "XII", "XII IPA 1", "XII-IPA-1", "XI MIPA 2", "X A"
const CLASS_TOKEN_RE = new RegExp(
  `^${ROMAN}(?:[\\s\\-]+(?:IPA|IPS|MIPA|MIA|IIS|BAHASA|BHS|[A-Z]|\\d{1,2})){0,3}$`,
  "i",
);
// Header-style line like "Kelas: XII IPA 1" or "Kelas 9A"
const CLASS_HEADER_RE =
  /^kelas\s*[:/-/]?\s*(.+)$/i;

/** Returns the class label if the trimmed string is recognisable as a class. */
function detectClassLabel(s: string): string | null {
  const cleaned = s.trim().replace(/\s+/g, " ");
  if (!cleaned) return null;

  // Header-style "Kelas: ..."
  const header = cleaned.match(CLASS_HEADER_RE);
  if (header) return header[1].trim().toUpperCase();

  // Pure class token, e.g. "XII IPA 1"
  if (CLASS_TOKEN_RE.test(cleaned)) return cleaned.toUpperCase();

  return null;
}

/**
 * Strip a leading class token from a name string and return the remainder.
 * Returns { className, rest } where className is null if nothing was found.
 */
function extractLeadingClass(name: string): {
  className: string | null;
  rest: string;
} {
  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return { className: null, rest: name };

  // Try greedy match: longest leading slice that still parses as a class.
  for (let take = Math.min(4, tokens.length - 1); take >= 1; take--) {
    const candidate = tokens.slice(0, take).join(" ");
    if (CLASS_TOKEN_RE.test(candidate)) {
      return {
        className: candidate.toUpperCase(),
        rest: tokens.slice(take).join(" "),
      };
    }
  }
  return { className: null, rest: name };
}

export function parseOcrText(raw: string, defaultClass?: string): Student[] {
  if (!raw) return [];

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const students: Student[] = [];
  // Class context: updated whenever we hit a header line; falls back to defaultClass.
  let activeClass: string | undefined = defaultClass?.toUpperCase();

  for (const original of lines) {
    const line = original.replace(LEADING_NUM, "");

    // 1) Pure class header line — update context, skip producing a student.
    //    Examples: "Kelas: XII IPA 1", "XII IPA 1", "X-IPA-2"
    const headerClass = detectClassLabel(line);
    if (headerClass) {
      activeClass = headerClass;
      continue;
    }

    // 2) Find ALL numbers on the line, pick the last one as the score.
    const numberMatches = [...line.matchAll(/-?\d+(?:[.,]\d+)?/g)];
    if (numberMatches.length === 0) continue;

    const lastMatch = numberMatches[numberMatches.length - 1];
    const scoreStr = lastMatch[0].replace(",", ".");
    const score = Number(scoreStr);

    // Everything before the score = candidate name.
    const nameRaw = line.slice(0, lastMatch.index ?? 0);
    let name = nameRaw.replace(SEPARATOR, " ").trim().replace(/\s+/g, " ");
    if (!name) continue;

    // 3) If the name STARTS with something that looks like a class token,
    //    peel it off and use it as the row's class.
    let rowClass = activeClass;
    const { className: leading, rest } = extractLeadingClass(name);
    if (leading) {
      rowClass = leading;
      name = rest;
    }
    if (!name) continue;

    const draft: Student = {
      id: uid(),
      name,
      score,
      className: rowClass,
      rank: 0,
      isValid: true,
    };

    students.push(validateStudent(draft));
  }

  return students;
}
