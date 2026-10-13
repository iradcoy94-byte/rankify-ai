import type { Student } from "./types";

/**
 * Generate a short unique id for a student row.
 * Uses crypto.randomUUID when available, falls back to a Math.random id.
 */
export function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
}

/**
 * Validate a single student row.
 * - name must be non-empty
 * - score must be a number in [0, 100]
 * Returns a NEW object with isValid + error filled in.
 */
export function validateStudent(s: Student): Student {
  const trimmed = typeof s.name === "string" ? s.name.trim() : "";
  if (!trimmed) {
    return { ...s, isValid: false, error: "Nama kosong" };
  }
  if (!Number.isFinite(s.score)) {
    return { ...s, isValid: false, error: "Nilai bukan angka" };
  }
  if (s.score < 0 || s.score > 100) {
    return { ...s, isValid: false, error: "Nilai harus 0–100" };
  }
  for (const [value, label] of [[s.pretest, "Pre-test"], [s.posttest, "Post-test"]] as const) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0 || value > 100)) {
      return { ...s, isValid: false, error: `${label} harus berupa angka 0–100` };
    }
  }
  if (s.meeting !== undefined && (!Number.isSafeInteger(s.meeting) || s.meeting < 1)) {
    return { ...s, isValid: false, error: "Pertemuan harus bilangan bulat positif" };
  }
  return { ...s, isValid: true, error: undefined };
}

/**
 * Apply dense ranking by score (descending), grouped per class.
 * Students without a class share a single "Tanpa Kelas" group.
 * Example scores within a class: 95, 95, 90, 80 → ranks: 1, 1, 2, 3
 * Invalid rows still receive a rank of 0 (pinned at the bottom of the table).
 */
export function applyDenseRanking(students: Student[]): Student[] {
  const valid = students.filter((s) => s.isValid);
  const invalid = students.filter((s) => !s.isValid);

  // Group valid students by class
  const groups = new Map<string | undefined, Student[]>();
  for (const s of valid) {
    const key = (s.className ?? "").trim() || undefined;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  const ranked: Student[] = [];
  for (const list of groups.values()) {
    const sorted = [...list].sort((a, b) => b.score - a.score);
    let currentRank = 0;
    let lastScore: number | null = null;
    for (const s of sorted) {
      if (lastScore === null || s.score !== lastScore) {
        currentRank += 1;
        lastScore = s.score;
      }
      ranked.push({ ...s, rank: currentRank });
    }
  }

  return [...ranked, ...invalid.map((s) => ({ ...s, rank: 0 }))];
}

/**
 * Convenience: validate every row, then re-apply ranking.
 * Use this anytime data changes.
 */
export function recompute(students: Student[]): Student[] {
  return applyDenseRanking(students.map(validateStudent));
}

/**
 * Dense ranking across ALL students (ignoring class). Used on the
 * "Peringkat Keseluruhan" page so rank 1,2,3,... is unique per score globally.
 */
export function applyGlobalDenseRanking(students: Student[]): Student[] {
  const valid = students.filter((s) => s.isValid);
  const invalid = students.filter((s) => !s.isValid);
  const sorted = [...valid].sort((a, b) => b.score - a.score);
  let currentRank = 0;
  let lastScore: number | null = null;
  const ranked = sorted.map((s) => {
    if (lastScore === null || s.score !== lastScore) {
      currentRank += 1;
      lastScore = s.score;
    }
    return { ...s, rank: currentRank };
  });
  return [...ranked, ...invalid.map((s) => ({ ...s, rank: 0 }))];
}

export function recomputeGlobal(students: Student[]): Student[] {
  return applyGlobalDenseRanking(students.map(validateStudent));
}
