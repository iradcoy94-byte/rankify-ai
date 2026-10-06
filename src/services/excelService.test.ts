import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseExcelFile } from "./excelService";
async function parse(rows: unknown[][], sheetName = "Eksperimen 1") {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sheetName);
  const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return parseExcelFile({ arrayBuffer: async () => buffer } as File);
}
describe("Excel grouping", () => {
  it("imports pre/post and meeting groups with decimal commas and sheet metadata", async () => {
    const result = await parse([["pretest", null, "pertemuan ke-3", null, "posttest"], ["Nama", "Nilai", "Nama", "Nilai", "Nama", "Nilai"], ["Andi", "82,5", "Andi", 90, "Andi", 95]]);
    expect(result.students.map(s => [s.kind, s.score, s.meeting])).toEqual([["pretest", 82.5, undefined], ["meeting", 90, 3], ["posttest", 95, undefined]]);
    expect(result.students.every(s => s.model === "Co-op Co-op + AI" && s.isValid)).toBe(true);
  });
  it("never steals a pair of columns from the next section", async () => {
    const result = await parse([["pretest", null, "posttest"], [null, null, "Nama", "Nilai"], [null, null, "Andi", 80]]);
    expect(result.students.map(s => s.kind)).toEqual(["posttest"]);
  });
  it("flags blank/boolean/out-of-range grades and missing headers", async () => {
    const result = await parse([["meeting 1"], ["Nama", "Nilai"], ["Andi", " "], ["Budi", true], ["Citra", 101]]);
    expect(result.students.map(s => s.isValid)).toEqual([false, false, false]);
    expect((await parse([["Nama", "Nilai"], ["Andi", 90]])).warnings).toHaveLength(1);
  });
});
