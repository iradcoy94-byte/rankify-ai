/**
 * Deterministic PRNG utilities for reproducible randomized tests.
 *
 * The seed comes from process.env.RANKIFY_TEST_SEED (integer) and falls back
 * to a fixed constant so `vitest run` is reproducible out of the box.
 * Uses mulberry32 — small, fast, and good enough for test data generation.
 */
import type { Student } from "@/lib/types";

export function testSeed(): number {
  const raw = process.env.RANKIFY_TEST_SEED;
  const parsed = raw === undefined ? NaN : Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 42;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random integer in [min, max] inclusive. */
export function randInt(next: () => number, min: number, max: number): number {
  return Math.floor(next() * (max - min + 1)) + min;
}

const FIRST_NAMES = [
  "Andi", "Budi", "Citra", "Dewi", "Eka", "Faiz", "Gita", "Hadi",
  "Indra", "Joko", "Kirana", "Lina", "Maya", "Nisa", "Oka", "Putri",
  "Rama", "Sari", "Tono", "Utari", "Vino", "Wati", "Yoga", "Zahra",
];
const LAST_NAMES = [
  "Pratama", "Wijaya", "Saputra", "Lestari", "Hidayat", "Maulana",
  "Anggraini", "Permana", "Safitri", "Ramadhan",
];
const CLASS_NAMES = [
  "XII IPA 1", "XII IPA 2", "XI IPS 1", "X MIPA 1", "IX A", "VIII B",
];

/** Build a randomized but deterministic list of students for ranking tests. */
export function makeSeededStudents(count: number, seed: number): Student[] {
  const next = mulberry32(seed);
  const used = new Set<string>();
  return Array.from({ length: count }, (_, i) => {
    let name = `${FIRST_NAMES[randInt(next, 0, FIRST_NAMES.length - 1)]} ${
      LAST_NAMES[randInt(next, 0, LAST_NAMES.length - 1)]
    }`;
    while (used.has(name)) {
      name += ` ${randInt(next, 1, 99)}`;
    }
    used.add(name);
    return {
      id: `seed-${seed}-${i}`,
      name,
      score: randInt(next, 0, 100),
      className: CLASS_NAMES[randInt(next, 0, CLASS_NAMES.length - 1)],
      rank: 0,
      isValid: true,
    };
  });
}
