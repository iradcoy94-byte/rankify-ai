import { describe, it, expect } from "vitest";
import { parseOcrText } from "@/lib/parser";
import { mulberry32, randInt, testSeed } from "./rng";

describe("parseOcrText — basic extraction", () => {
  it("returns [] for empty input", () => {
    expect(parseOcrText("")).toEqual([]);
  });

  it("returns [] for blank-only input", () => {
    expect(parseOcrText("   \n  \n")).toEqual([]);
  });

  it("parses a simple name + score line", () => {
    const out = parseOcrText("Andi 90");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ name: "Andi", score: 90, isValid: true });
  });

  it("ignores leading list numbering", () => {
    const out = parseOcrText("1. Gita 88\n2) Budi 72\n3 - Sari 95");
    expect(out.map((s) => s.name)).toEqual(["Gita", "Budi", "Sari"]);
    expect(out.map((s) => s.score)).toEqual([88, 72, 95]);
  });

  it("skips lines with no number", () => {
    const out = parseOcrText("Nama\nNilai\nAndi 90");
    expect(out.map((s) => s.name)).toEqual(["Andi"]);
  });

  it("uses the LAST number on a line as the score", () => {
    const out = parseOcrText("Hadi 88 tuntas");
    expect(out[0]).toMatchObject({ name: "Hadi", score: 88 });
  });
});

describe("parseOcrText — separators", () => {
  it("accepts colon separator", () => {
    expect(parseOcrText("Budi: 85")[0]).toMatchObject({ name: "Budi", score: 85 });
  });

  it("accepts dash separator", () => {
    expect(parseOcrText("Citra - 88")[0]).toMatchObject({ name: "Citra", score: 88 });
  });

  it("accepts equals separator", () => {
    expect(parseOcrText("Dewi = 72")[0]).toMatchObject({ name: "Dewi", score: 72 });
  });

  it("accepts pipe separator", () => {
    expect(parseOcrText("Eka | 95")[0]).toMatchObject({ name: "Eka", score: 95 });
  });

  it("accepts tab separator", () => {
    expect(parseOcrText("Faiz\t80")[0]).toMatchObject({ name: "Faiz", score: 80 });
  });

  it("accepts comma decimal separator", () => {
    expect(parseOcrText("Gita 87,5")[0]).toMatchObject({ name: "Gita", score: 87.5 });
  });
});

describe("parseOcrText — class detection", () => {
  it("reads a 'Kelas:' header and applies it to following rows", () => {
    const out = parseOcrText("Kelas: XII IPA 1\nAndi 90\nBudi 80");
    expect(out.map((s) => s.className)).toEqual(["XII IPA 1", "XII IPA 1"]);
  });

  it("reads a bare class-name header line", () => {
    const out = parseOcrText("XI IPS 2\nAndi 90");
    expect(out[0].className).toBe("XI IPS 2");
  });

  it("reads a dashed class header (X-IPA-2)", () => {
    const out = parseOcrText("X-IPA-2\nAndi 90");
    expect(out[0].className).toBe("X-IPA-2");
  });

  it("reads 'Kelas 9A' header", () => {
    const out = parseOcrText("Kelas 9A\nAndi 90");
    expect(out[0].className).toBe("9A");
  });

  it("switches class context when a new header appears", () => {
    const out = parseOcrText(
      "Kelas: XII IPA 1\nAndi 90\nKelas: XI IPS 1\nBudi 85",
    );
    expect(out.map((s) => [s.name, s.className])).toEqual([
      ["Andi", "XII IPA 1"],
      ["Budi", "XI IPS 1"],
    ]);
  });

  it("promotes an inline leading class token to className", () => {
    const out = parseOcrText("XII Andi 90");
    expect(out[0]).toMatchObject({ name: "Andi", className: "XII", score: 90 });
  });

  it("peels a multi-word inline class token", () => {
    const out = parseOcrText("XII IPA 1 Andi 90");
    expect(out[0]).toMatchObject({
      name: "Andi",
      className: "XII IPA 1",
      score: 90,
    });
  });

  it("keeps a non-class leading word in the name", () => {
    const out = parseOcrText("Dimas 90");
    expect(out[0]).toMatchObject({ name: "Dimas", className: undefined });
  });

  it("falls back to defaultClass when no header is present", () => {
    const out = parseOcrText("Andi 90", "X MIPA 1");
    expect(out[0].className).toBe("X MIPA 1");
  });

  it("uppercases the default class consistently", () => {
    const out = parseOcrText("Andi 90", "xii ipa 2");
    expect(out[0].className).toBe("XII IPA 2");
  });

  it("prefers the header class over defaultClass", () => {
    const out = parseOcrText("Kelas: IX A\nAndi 90", "XII IPA 1");
    expect(out[0].className).toBe("IX A");
  });
});

describe("parseOcrText — validation", () => {
  it("flags a score above 100", () => {
    const out = parseOcrText("Andi 120");
    expect(out[0].isValid).toBe(false);
  });

  it("flags a negative score", () => {
    const out = parseOcrText("Andi -5");
    expect(out[0].isValid).toBe(false);
  });

  it("produces unique ids for every row", () => {
    const out = parseOcrText("Andi 90\nBudi 80\nCitra 70");
    const ids = new Set(out.map((s) => s.id));
    expect(ids.size).toBe(3);
  });
});

describe("parseOcrText — randomized OCR-like noise", () => {
  const NAMES = ["Andi", "Budi", "Citra", "Dewi", "Eka", "Faiz", "Gita", "Hadi"];
  const SEPS = [" ", ": ", " - ", " = ", " | ", "\t"];

  it("extracts every row from a noisy multi-class sheet", () => {
    const seed = testSeed();
    const next = mulberry32(seed);
    const classes = ["XII IPA 1", "XI IPS 2"];
    const lines: string[] = [];
    const expected: { name: string; score: number }[] = [];

    for (const cls of classes) {
      lines.push(`Kelas: ${cls}`);
      const n = randInt(next, 3, 8);
      for (let i = 0; i < n; i++) {
        const name = NAMES[randInt(next, 0, NAMES.length - 1)] +
          (i > 0 ? ` ${i}` : "");
        const score = randInt(next, 0, 100);
        const sep = SEPS[randInt(next, 0, SEPS.length - 1)];
        lines.push(`${i + 1}. ${name}${sep}${score}`);
        expected.push({ name, score });
      }
    }

    const out = parseOcrText(lines.join("\n"));
    expect(out.map((s) => ({ name: s.name, score: s.score }))).toEqual(expected);
    expect(out.every((s) => s.isValid)).toBe(true);
    // Every row carries the class from its section header.
    const firstCount = classes.length > 0 ? out.filter((s) => s.className === classes[0]).length : 0;
    expect(out.slice(0, firstCount).every((s) => s.className === classes[0])).toBe(true);
  });

  it("handles randomized junk lines without throwing", () => {
    const seed = testSeed() + 5;
    const next = mulberry32(seed);
    const junk = [
      "", "   ", "!!!", "abc", "123", "Kelas:", "\t\t", "---", "0",
    ];
    for (let i = 0; i < 60; i++) {
      const lines: string[] = [];
      const n = randInt(next, 1, 6);
      for (let j = 0; j < n; j++) {
        lines.push(junk[randInt(next, 0, junk.length - 1)]);
      }
      expect(() => parseOcrText(lines.join("\n"))).not.toThrow();
    }
  });

  it("survives a dense randomized sheet and validates correctly", () => {
    const seed = testSeed() + 11;
    const next = mulberry32(seed);
    const lines: string[] = ["Kelas: XII IPA 1"];
    let valid = 0;
    let invalid = 0;
    for (let i = 0; i < 200; i++) {
      const score = randInt(next, -20, 120);
      if (score >= 0 && score <= 100) valid++;
      else invalid++;
      lines.push(`Siswa${i} ${score}`);
    }
    const out = parseOcrText(lines.join("\n"));
    expect(out).toHaveLength(200);
    expect(out.filter((s) => s.isValid)).toHaveLength(valid);
    expect(out.filter((s) => !s.isValid)).toHaveLength(invalid);
  });
});
