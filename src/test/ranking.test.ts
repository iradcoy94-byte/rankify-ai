import { describe, expect, it } from "vitest";
import { applyDenseRanking, calculateNGain, meetsKkm, recompute, validateStudent } from "@/lib/ranking";
import type { Student } from "@/lib/types";

function row(id: string, name: string, score: number, className = "A"): Student {
  return { id, name, score, className, rank: 0, isValid: true };
}

describe("score validation and metrics", () => {
  it("accepts score boundaries and rejects missing or out-of-range values", () => {
    expect(validateStudent(row("low", "Siswa", 0)).isValid).toBe(true);
    expect(validateStudent(row("high", "Siswa", 100)).isValid).toBe(true);
    expect(validateStudent(row("empty", "", 50)).error).toBe("Nama kosong");
    expect(validateStudent(row("negative", "Siswa", -1)).isValid).toBe(false);
    expect(validateStudent(row("overflow", "Siswa", 101)).isValid).toBe(false);
  });

  it("calculates normalized gain and handles a full pretest score", () => {
    expect(calculateNGain(40, 70)).toBe(0.5);
    expect(calculateNGain(100, 100)).toBe(0);
    expect(calculateNGain(undefined, 80)).toBeUndefined();
  });

  it("applies a configurable KKM boundary", () => {
    expect(meetsKkm(68, 68)).toBe(true);
    expect(meetsKkm(67.99, 68)).toBe(false);
    expect(meetsKkm(75, 76)).toBe(false);
  });

  it("uses dense ranks for ties and keeps classes separate", () => {
    const ranked = applyDenseRanking([
      row("a", "A", 95), row("b", "B", 95), row("c", "C", 88), row("d", "D", 70, "B"),
    ]);
    expect(Object.fromEntries(ranked.map((student) => [student.id, student.rank]))).toEqual({ a: 1, b: 1, c: 2, d: 1 });
  });

  it("marks invalid rows and recalculates rank after edits", () => {
    const ranked = recompute([row("a", "A", 90), row("b", "B", Number.NaN)]);
    expect(ranked.find((student) => student.id === "a")?.rank).toBe(1);
    expect(ranked.find((student) => student.id === "b")?.isValid).toBe(false);
  });
});
