import { describe, expect, it } from "vitest";
import { parseOcrText } from "./parser";
describe("OCR text import", () => {
  it("preserves hyphenated names and parses decimal commas/class headers", () => {
    const rows = parseOcrText("Kelas: XII IPA 1\n1. Anne-Marie: 87,5\n2) Budi | 90\nKelas 9A\nCitra - 88");
    expect(rows.map(s => [s.name, s.score, s.className])).toEqual([["Anne-Marie", 87.5, "XII IPA 1"], ["Budi", 90, "XII IPA 1"], ["Citra", 88, "9A"]]);
  });
  it("extracts inline classes and flags invalid grades without losing rows", () => {
    const rows = parseOcrText("XII Andi 90\nDewi -5\nEka 150", "XI IPA 2");
    expect(rows[0]).toMatchObject({ name: "Andi", className: "XII", isValid: true });
    expect(rows.slice(1).map(s => s.isValid)).toEqual([false, false]);
  });
  it("ignores empty/unstructured input and keeps IDs distinct", () => {
    expect(parseOcrText("\nDaftar siswa\n")).toEqual([]);
    const rows = parseOcrText("Andi 90\nAndi 90");
    expect(new Set(rows.map(s => s.id)).size).toBe(2);
  });
});
