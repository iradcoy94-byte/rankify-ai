/**
 * excelService.ts
 *
 * Parser khusus untuk format Excel penelitian Rankify.AI.
 *
 * Format file yang didukung (berdasarkan Contoh.xlsx):
 * ─────────────────────────────────────────────────────
 * • Sheet name → otomatis menjadi className DAN model pembelajaran
 *     "Konvensional"  → className="Konvensional", model="Konvensional"
 *     "Eksperimen 1"  → className="Eksperimen 1", model="Co-op Co-op + AI"
 *     "Eksperimen 2"  → className="Eksperimen 2", model="Co-op Co-op"
 *
 * • Baris header grup (baris ke-2 atau yang berisi label jenis penilaian):
 *     "pre-test" | "pretest" | "pertemuan 1" | … | "post-test" | "posttest"
 *   Label ini berlaku untuk seluruh pasangan (Nama, Nilai) di kolom berikutnya.
 *
 * • Baris sub-header (baris ke-3): "Nama" | "Nilai" berulang → dilewati
 *
 * • Baris data: setiap baris berisi nama & nilai untuk setiap jenis penilaian
 *   secara horizontal (multi-kolom per baris).
 *
 * Output: array Student — satu Student per (siswa × jenis penilaian).
 * ─────────────────────────────────────────────────────
 */

import * as XLSX from "xlsx";
import { uid, validateStudent } from "@/lib/ranking";
import type { Student, LearningModel, ScoreKind } from "@/lib/types";

// ── Mapping sheet name → learning model ──────────────────────────────────────

function sheetNameToModel(name: string): LearningModel {
  const n = name.toLowerCase().trim();
  if (n.includes("eksperimen 1") || n === "eksp1" || n === "eksp. 1") return "Co-op Co-op + AI";
  if (n.includes("eksperimen 2") || n === "eksp2" || n === "eksp. 2") return "Co-op Co-op";
  return "Konvensional";
}

// ── Detect jenis penilaian from a cell string ─────────────────────────────────

type SectionLabel =
  | { kind: "pretest" }
  | { kind: "posttest" }
  | { kind: "meeting"; meeting: number };

function detectSection(cell: unknown): SectionLabel | null {
  if (cell == null || cell === "") return null;
  const s = String(cell).toLowerCase().trim();
  if (s === "pre-test" || s === "pretest" || s === "pre test") return { kind: "pretest" };
  if (s === "post-test" || s === "posttest" || s === "post test") return { kind: "posttest" };
  // "pertemuan 1", "pertemuan 2", …, "pertemuan ke-3", "meeting 1"
  const m = s.match(/(?:pertemuan|pertemuan ke[-\s]?|meeting)\s*[-:]?\s*(\d+)/i);
  if (m) return { kind: "meeting", meeting: Number(m[1]) };
  return null;
}

// ── Check if a row is the sub-header ("Nama", "Nilai", …) ────────────────────

function isSubHeaderRow(row: unknown[]): boolean {
  const nonNull = row.filter((c) => c != null && c !== "");
  if (nonNull.length === 0) return false;
  return nonNull.every((c) => {
    const s = String(c).toLowerCase().trim();
    return s === "nama" || s === "nilai" || s === "name" || s === "score" || s === "skor";
  });
}

// ── Main column-group scanner ─────────────────────────────────────────────────
// A "group" is: [sectionLabel, nameColIdx, valueColIdx]

interface ColGroup {
  section: SectionLabel;
  nameCol: number;
  valueCol: number;
}

/**
 * Scan the header row to find all (section, nameCol, valueCol) groups.
 *
 * The header row contains section labels at certain columns, e.g.:
 *   col1: "pre-test"  col4: "pertemuan 1"  col7: "pertemuan 2" …
 *
 * Each section label is followed (within ±3 columns) by a pair of
 * "Nama" / "Nilai" sub-columns (from the sub-header row).
 * We use the sub-header row to pin the exact column indices.
 */
function findColGroups(headerRow: unknown[], subHeaderRow: unknown[]): ColGroup[] {
  const groups: ColGroup[] = [];

  // Collect all section labels with their column index
  const sections: { col: number; section: SectionLabel }[] = [];
  for (let c = 0; c < headerRow.length; c++) {
    const sec = detectSection(headerRow[c]);
    if (sec) sections.push({ col: c, section: sec });
  }

  if (sections.length === 0) return groups;

  // For each section, find the next "Nama" col and the "Nilai" col after it
  // by scanning the sub-header row starting from the section's column.
  for (const { col, section } of sections) {
    let nameCol = -1;
    let valueCol = -1;

    // Scan rightward up to the next section (or end of row + 8 cols slack)
    const scanEnd = Math.min(subHeaderRow.length, col + 10);
    for (let c = col; c < scanEnd; c++) {
      const s = String(subHeaderRow[c] ?? "").toLowerCase().trim();
      if (s === "nama" || s === "name") { nameCol = c; continue; }
      if ((s === "nilai" || s === "score" || s === "skor") && nameCol !== -1) {
        valueCol = c;
        break;
      }
    }

    if (nameCol !== -1 && valueCol !== -1) {
      groups.push({ section, nameCol, valueCol });
    }
  }

  return groups;
}

// ── Public result type ────────────────────────────────────────────────────────

export interface ExcelParseResult {
  students: Student[];
  /** All sheet names found */
  sheetNames: string[];
  /** Section labels found (e.g. ["pretest","pertemuan1","posttest"]) */
  sectionsFound: string[];
  warnings: string[];
  /** Total raw data rows across all sheets */
  rawRowCount: number;
}

// ── Main parse function ───────────────────────────────────────────────────────

export async function parseExcelFile(file: File): Promise<ExcelParseResult> {
  const warnings: string[] = [];
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", cellDates: false });

  if (wb.SheetNames.length === 0) {
    return { students: [], sheetNames: [], sectionsFound: [], warnings: ["File tidak memiliki sheet."], rawRowCount: 0 };
  }

  const allStudents: Student[] = [];
  const allSections = new Set<string>();
  let totalRaw = 0;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    // Convert to 2D array (no auto-header-detection)
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,       // return array-of-arrays
      defval: null,
      raw: true,       // keep raw types (numbers stay numbers)
    });

    // Find header row: the row that contains at least one section label
    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const hasSection = rows[r].some((c) => detectSection(c) !== null);
      if (hasSection) { headerRowIdx = r; break; }
    }

    if (headerRowIdx === -1) {
      warnings.push(`Sheet "${sheetName}": baris header jenis penilaian tidak ditemukan.`);
      continue;
    }

    // The sub-header row (Nama/Nilai) is usually the next non-empty row
    let subHeaderRowIdx = headerRowIdx + 1;
    while (
      subHeaderRowIdx < rows.length &&
      rows[subHeaderRowIdx].every((c) => c == null || c === "")
    ) {
      subHeaderRowIdx++;
    }

    if (subHeaderRowIdx >= rows.length || !isSubHeaderRow(rows[subHeaderRowIdx])) {
      warnings.push(`Sheet "${sheetName}": baris sub-header "Nama/Nilai" tidak ditemukan.`);
      continue;
    }

    const headerRow = rows[headerRowIdx];
    const subHeaderRow = rows[subHeaderRowIdx];
    const colGroups = findColGroups(headerRow, subHeaderRow);

    if (colGroups.length === 0) {
      warnings.push(`Sheet "${sheetName}": tidak ada grup kolom (Nama+Nilai) yang terdeteksi.`);
      continue;
    }

    // Collect section labels for display
    for (const g of colGroups) {
      if (g.section.kind === "pretest") allSections.add("Pre-test");
      else if (g.section.kind === "posttest") allSections.add("Post-test");
      else allSections.add(`Pertemuan ${g.section.meeting}`);
    }

    const className = sheetName.trim();
    const model = sheetNameToModel(sheetName);

    // Data rows start after sub-header
    const dataStartIdx = subHeaderRowIdx + 1;

    for (let r = dataStartIdx; r < rows.length; r++) {
      const row = rows[r];
      // Skip fully empty rows
      if (row.every((c) => c == null || c === "")) continue;

      totalRaw++;

      for (const { section, nameCol, valueCol } of colGroups) {
        const rawName = String(row[nameCol] ?? "").trim();
        const rawValue = row[valueCol];
        const score = rawValue == null || rawValue === "" ? NaN : Number(rawValue);

        if (!rawName) continue; // skip blank name for this group

        let kind: ScoreKind = "meeting";
        let meeting: number | undefined;
        let pretest: number | undefined;
        let posttest: number | undefined;

        if (section.kind === "pretest") {
          kind = "pretest";
          pretest = isNaN(score) ? undefined : score;
        } else if (section.kind === "posttest") {
          kind = "posttest";
          posttest = isNaN(score) ? undefined : score;
        } else {
          kind = "meeting";
          meeting = section.meeting;
        }

        const draft: Student = {
          id: uid(),
          name: rawName,
          score,
          className,
          model,
          kind,
          meeting,
          pretest,
          posttest,
          rank: 0,
          isValid: true,
        };

        allStudents.push(validateStudent(draft));
      }
    }
  }

  return {
    students: allStudents,
    sheetNames: wb.SheetNames,
    sectionsFound: Array.from(allSections),
    warnings,
    rawRowCount: totalRaw,
  };
}
