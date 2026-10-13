import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseExcelFile } from "@/services/excelService";

describe("Excel import", () => {
  it("reads NISN, name, and score from a research assessment sheet", async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Pre-test", null, null],
      ["NISN", "Nama", "Nilai"],
      ["0012345678", "Siswa Pilot", 87],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Kelas A");
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    const file = { arrayBuffer: async () => bytes } as File;

    const result = await parseExcelFile(file);

    expect(result.students).toHaveLength(1);
    expect(result.students[0]).toMatchObject({ nisn: "0012345678", name: "Siswa Pilot", className: "Kelas A", kind: "pretest", score: 87, isValid: true });
  });
});
