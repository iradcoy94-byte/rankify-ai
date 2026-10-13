import { describe, expect, it } from "vitest";
import { recompute, recomputeGlobal, validateStudent } from "./ranking";
import type { Student } from "./types";
const row = (id: string, score: number, className?: string): Student => ({ id, score, className, name: id, rank: 0, isValid: false });
describe("ranking and validation", () => {
  it.each([NaN, Infinity, -Infinity, undefined, "90", -1, 101])("rejects invalid numeric score %s", score => {
    expect(validateStudent(row("Andi", score as number)).isValid).toBe(false);
  });
  it("validates optional scores/meetings while retaining legitimate missing values", () => {
    expect(validateStudent(row("Andi", 0)).isValid).toBe(true);
    expect(validateStudent({ ...row("Andi", 100), pretest: Infinity }).isValid).toBe(false);
    expect(validateStudent({ ...row("Andi", 90), posttest: -1 }).isValid).toBe(false);
    for (const meeting of [0, -1, 1.5, Infinity]) expect(validateStudent({ ...row("Andi", 90), meeting }).isValid).toBe(false);
    expect(validateStudent({ ...row("Andi", 90), meeting: 1, pretest: 0, posttest: 100 }).isValid).toBe(true);
  });
  it("keeps unnamed and literally named sentinel classes separate", () => {
    expect(recompute([row("A", 80), row("B", 100, "__none__")]).map(s => s.rank)).toEqual([1, 1]);
  });
  it("assigns dense ties per class and globally without mutating input", () => {
    const input = [row("A", 95, "X"), row("B", 95, "X"), row("C", 80, "X"), row("D", 100, "Y"), row("E", NaN)];
    const copy = structuredClone(input);
    expect(recompute(input).map(s => [s.id, s.rank])).toEqual([["A", 1], ["B", 1], ["C", 2], ["D", 1], ["E", 0]]);
    expect(recomputeGlobal(input).map(s => [s.id, s.rank])).toEqual([["D", 1], ["A", 2], ["B", 2], ["C", 3], ["E", 0]]);
    expect(input).toEqual(copy);
  });
  it("checks seeded randomized rankings against a distinct-score oracle", () => {
    let seed = Number(process.env.RANKIFY_TEST_SEED ?? 1) >>> 0;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    const input = Array.from({ length: 160 }, (_, i) => row(`Siswa ${i}`, random() % 12 === 0 ? NaN : (random() % 21) * 5, [undefined, "X", " Y "][random() % 3]));
    for (const global of [false, true]) {
      const ranked = global ? recomputeGlobal(input) : recompute(input);
      for (const student of ranked) {
        const higher = input.filter(other => Number.isFinite(other.score) && other.score > student.score && (global || (other.className ?? "").trim() === (student.className ?? "").trim()));
        expect(student.rank).toBe(Number.isFinite(student.score) ? 1 + new Set(higher.map(s => s.score)).size : 0);
      }
    }
  });
});
