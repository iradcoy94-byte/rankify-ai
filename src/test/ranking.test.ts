import { describe, it, expect, vi } from "vitest";
import {
  applyDenseRanking,
  applyGlobalDenseRanking,
  recompute,
  recomputeGlobal,
  validateStudent,
  uid,
} from "@/lib/ranking";
import type { Student } from "@/lib/types";
import {
  mulberry32,
  makeSeededStudents,
  randInt,
  testSeed,
} from "./rng";

function row(name: string, score: number, className?: string): Student {
  return { id: uid(), name, score, className, rank: 0, isValid: true };
}

describe("validateStudent", () => {
  it("accepts a well-formed row", () => {
    const s = row("Andi", 85, "XII IPA 1");
    expect(validateStudent(s)).toMatchObject({ isValid: true, error: undefined });
  });

  it("flags an empty name", () => {
    expect(validateStudent(row("", 90))).toMatchObject({
      isValid: false,
      error: "Nama kosong",
    });
    expect(validateStudent(row("   ", 90)).isValid).toBe(false);
  });

  it("flags NaN and out-of-range scores", () => {
    expect(validateStudent(row("Andi", NaN)).isValid).toBe(false);
    expect(validateStudent(row("Andi", -1))).toMatchObject({
      isValid: false,
      error: "Nilai harus 0–100",
    });
    expect(validateStudent(row("Andi", 101))).toMatchObject({
      isValid: false,
      error: "Nilai harus 0–100",
    });
  });

  it("accepts the boundary scores 0 and 100", () => {
    expect(validateStudent(row("Andi", 0)).isValid).toBe(true);
    expect(validateStudent(row("Andi", 100)).isValid).toBe(true);
  });

  it("does not mutate the original row", () => {
    const s = row("Andi", 85);
    validateStudent(s);
    expect(s.isValid).toBe(true);
    expect(s.error).toBeUndefined();
  });
});

describe("applyDenseRanking", () => {
  it("produces the documented 1,1,2,3 dense ranking", () => {
    const ranked = applyDenseRanking([
      row("A", 95, "X"),
      row("B", 95, "X"),
      row("C", 90, "X"),
      row("D", 80, "X"),
    ]);
    expect(ranked.map((s) => s.rank)).toEqual([1, 1, 2, 3]);
  });

  it("ranks each class group independently", () => {
    const ranked = applyDenseRanking([
      row("A", 90, "X"),
      row("B", 70, "Y"),
      row("C", 85, "X"),
      row("D", 95, "Y"),
    ]);
    const byName = Object.fromEntries(ranked.map((s) => [s.name, s.rank]));
    expect(byName).toEqual({ A: 1, C: 2, D: 1, B: 2 });
  });

  it("assigns rank 0 to invalid rows and sorts them last", () => {
    const ranked = applyDenseRanking([
      row("valid", 80, "X"),
      { ...row("no-name", 70, "X"), name: "", isValid: false },
    ]);
    expect(ranked[0]).toMatchObject({ name: "valid", rank: 1 });
    expect(ranked[1]).toMatchObject({ name: "", rank: 0 });
  });

  it("groups rows without a class into a single Tanpa-Kelas pool", () => {
    const ranked = applyDenseRanking([row("A", 30), row("B", 60)]);
    expect(ranked.map((s) => s.rank)).toEqual([1, 2]);
  });

  it("handles an empty list", () => {
    expect(applyDenseRanking([])).toEqual([]);
  });

  it("matches a brute-force reference on randomized data", () => {
    const seed = testSeed();
    const students = makeSeededStudents(120, seed);
    const ranked = applyDenseRanking(students);

    // Brute-force reference: dense rank = 1 + number of DISTINCT strictly
    // higher scores within the same class group.
    const refByClass = new Map<string, Student[]>();
    for (const s of students) {
      const key = (s.className ?? "").trim() || "__none__";
      if (!refByClass.has(key)) refByClass.set(key, []);
      refByClass.get(key)!.push(s);
    }
    const expected = new Map<string, number>();
    for (const [key, list] of refByClass) {
      for (const s of list) {
        const distinctHigher = new Set(
          list.filter((o) => o.score > s.score).map((o) => o.score),
        ).size;
        expected.set(`${key}|${s.id}`, distinctHigher + 1);
      }
    }
    for (const s of ranked) {
      const key = ((s.className ?? "").trim() || "__none__") + "|" + s.id;
      expect(s.rank, `rank mismatch for ${s.name} (seed ${seed})`).toBe(
        expected.get(key)!,
      );
    }
  });

  it("produces consecutive-by-score ranks on randomized data", () => {
    const seed = testSeed() + 7;
    const ranked = applyDenseRanking(makeSeededStudents(200, seed));
    const groups = new Map<string, Student[]>();
    for (const s of ranked) {
      const key = (s.className ?? "").trim() || "__none__";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
    for (const [key, list] of groups) {
      const sorted = [...list].sort((a, b) => b.score - a.score);
      let expectedRank = 0;
      let prev: number | null = null;
      for (const s of sorted) {
        if (prev === null || s.score !== prev) {
          expectedRank += 1;
          prev = s.score;
        }
        expect(s.rank, `group ${key}`).toBe(expectedRank);
      }
    }
  });
});

describe("applyGlobalDenseRanking", () => {
  it("ignores class and ranks globally", () => {
    const ranked = applyGlobalDenseRanking([
      row("A", 90, "X"),
      row("B", 95, "Y"),
      row("C", 90, "X"),
    ]);
    const byName = Object.fromEntries(ranked.map((s) => [s.name, s.rank]));
    expect(byName).toEqual({ B: 1, A: 2, C: 2 });
  });

  it("is consistent with per-class dense ranking within a single class", () => {
    const seed = testSeed() + 13;
    const students = makeSeededStudents(60, seed).filter(
      (s) => s.className === "XII IPA 1",
    );
    const perClass = applyDenseRanking(students).map((s) => `${s.name}:${s.rank}`);
    const global = applyGlobalDenseRanking(students).map((s) => `${s.name}:${s.rank}`);
    expect(perClass.sort()).toEqual(global.sort());
  });
});

describe("recompute / recomputeGlobal", () => {
  it("validate + rank pipeline preserves valid rows", () => {
    const seed = testSeed() + 21;
    const students = makeSeededStudents(50, seed);
    const out = recompute(students);
    expect(out).toHaveLength(students.length);
    expect(out.every((s) => typeof s.rank === "number")).toBe(true);
  });

  it("revalidates rows whose score changed to invalid", () => {
    const seed = testSeed() + 29;
    const students = makeSeededStudents(12, seed);
    const edited = students.map((s, i) =>
      i === 0 ? { ...s, score: 250 } : s,
    );
    const out = recompute(edited);
    const target = out.find((s) => s.id === edited[0].id)!;
    expect(target.isValid).toBe(false);
    expect(target.error).toBe("Nilai harus 0–100");
    expect(target.rank).toBe(0);
  });

  it("recomputeGlobal ranks globally after validation", () => {
    const seed = testSeed() + 37;
    const out = recomputeGlobal(makeSeededStudents(40, seed));
    const valid = out.filter((s) => s.isValid);
    const scores = valid.map((s) => s.score);
    const ranks = valid.map((s) => s.rank);
    // Ties share a rank; descending scores ⇒ non-increasing ranks.
    for (let i = 1; i < valid.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
      expect(ranks[i]).toBeGreaterThanOrEqual(ranks[i - 1]);
    }
  });
});

describe("uid", () => {
  it("produces unique ids across many calls", () => {
    const ids = new Set(Array.from({ length: 200 }, uid));
    expect(ids.size).toBe(200);
  });

  it("falls back to Math.random when randomUUID is unavailable", () => {
    const orig = globalThis.crypto;
    vi.stubGlobal("crypto", { ...orig, randomUUID: undefined });
    try {
      const id = uid();
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(5);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("randomized validation fuzz", () => {
  it("validateStudent never throws on arbitrary numeric inputs", () => {
    const next = mulberry32(testSeed() + 101);
    for (let i = 0; i < 500; i++) {
      const score = randInt(next, -200, 200);
      const s = validateStudent(row(`S${i}`, score));
      const valid = !Number.isNaN(score) && score >= 0 && score <= 100;
      expect(s.isValid).toBe(valid);
      if (!valid) expect(typeof s.error).toBe("string");
    }
  });
});
