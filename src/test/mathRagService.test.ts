import { describe, expect, it } from "vitest";
import {
  chunkMathContent,
  containsMathFormulas,
} from "@/services/mathRagService";

describe("mathRagService — Deteksi Formula Matematika", () => {
  it("mendeteksi rumus inline LaTeX $...$", () => {
    expect(containsMathFormulas("Persamaan kuadrat memiliki bentuk $ax^2 + bx + c = 0$.")).toBe(true);
  });

  it("mendeteksi rumus display LaTeX $$...$$", () => {
    expect(containsMathFormulas("Rumus integral:\n$$f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$")).toBe(true);
  });

  it("mendeteksi environment LaTeX \\begin{aligned}", () => {
    const text = "\\begin{aligned} 2x + y &= 5 \\\\ x - y &= 1 \\end{aligned}";
    expect(containsMathFormulas(text)).toBe(true);
  });

  it("mendeteksi simbol matematika Unicode umum", () => {
    expect(containsMathFormulas("Nilai akar kuadrat √16 = 4 dan π ≈ 3.14")).toBe(true);
  });

  it("mengembalikan false untuk teks biasa tanpa formula", () => {
    expect(containsMathFormulas("Selamat datang di platform pembelajaran Rankify AI.")).toBe(false);
    expect(containsMathFormulas("")).toBe(false);
  });
});

describe("mathRagService — Chunking Matematika & Preservasi Formula", () => {
  it("mengembalikan 1 chunk jika teks pendek di bawah batas maksimum", () => {
    const text = "Definisi: Bilangan prima adalah bilangan asli lebih dari 1 yang hanya memiliki dua faktor.";
    const chunks = chunkMathContent(text, { maxChunkSize: 500 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it("mengembalikan array kosong untuk string kosong atau spasi saja", () => {
    expect(chunkMathContent("")).toEqual([]);
    expect(chunkMathContent("   \n\n  ")).toEqual([]);
  });

  it("mempertahankan keutuhan formula inline tanpa terpotong di tengah jalan", () => {
    const longPrefix = "A".repeat(300);
    const formula = "$\\int_{0}^{\\pi} \\sin(x) \\, dx = 2$";
    const longSuffix = "B".repeat(300);
    const text = `${longPrefix}\n\nPerhatikan formula penting berikut: ${formula}\n\n${longSuffix}`;

    const chunks = chunkMathContent(text, { maxChunkSize: 400 });
    expect(chunks.length).toBeGreaterThan(1);
    // Formula harus utuh di salah satu chunk
    const hasFullFormula = chunks.some((c) => c.includes(formula));
    expect(hasFullFormula).toBe(true);

    // Tidak boleh ada chunk yang mengandung pecahan formula yang rusak
    for (const c of chunks) {
      const openDollars = (c.match(/\$/g) || []).length;
      expect(openDollars % 2).toBe(0);
    }
  });

  it("mempertahankan keutuhan formula display $$...$$ multiline", () => {
    const displayMath = "$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$";
    const text = `Definisi Matriks:\n${displayMath}\n\nDeterminan matriks dihitung dengan $ad - bc$.`;

    const chunks = chunkMathContent(text, { maxChunkSize: 1000 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toContain(displayMath);
  });

  it("memecah secara rapi berdasarkan unit konsep (Definisi, Teorema, Contoh)", () => {
    const unit1 = "Definisi 1.1: Fungsi kuadrat adalah fungsi polinomial berderajat dua dengan bentuk $f(x) = ax^2 + bx + c$.";
    const unit2 = "Teorema 1.1: Jika diskriminan $D = b^2 - 4ac > 0$, maka kurva memotong sumbu-X di dua titik berlainan.";
    const unit3 = "Contoh Soal 1:\nTentukan pembuat nol fungsi $f(x) = x^2 - 5x + 6$.\n\nPenyelesaian:\nFaktorkan $(x-2)(x-3) = 0$, sehingga $x = 2$ atau $x = 3$.";

    const fullText = `${unit1}\n\n${unit2}\n\n${unit3}`;
    const chunks = chunkMathContent(fullText, { maxChunkSize: 250 });

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    // Pastikan teks dalam chunk tidak kehilangan formula matematika
    const joined = chunks.join(" ");
    expect(joined).toContain("$f(x) = ax^2 + bx + c$");
    expect(joined).toContain("$D = b^2 - 4ac > 0$");
    expect(joined).toContain("$(x-2)(x-3) = 0$");
  });
});
