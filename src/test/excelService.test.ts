import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  buildResearchWorkbook,
  parseExcelFile,
} from "@/services/excelService";

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

  it("builds research report workbook with summary and student sheets", () => {
    const mockSummaries = [
      {
        className: "XII MIPA 1",
        model: "Co-op Co-op + AI",
        studentCount: 30,
        avgPretest: 45.5,
        avgPosttest: 85.2,
        avgNGain: 0.73,
        nGainCategory: "Tinggi",
        tuntasCount: 28,
        tuntasPercentage: 93,
      },
    ];

    const mockStudents = [
      {
        nisn: "0012345678",
        name: "Ahmad Siswa",
        className: "XII MIPA 1",
        model: "Co-op Co-op + AI",
        pretest: 50,
        posttest: 90,
        nGain: 0.8,
        nGainCategory: "Tinggi",
        isTuntas: true,
      },
    ];

    const wb = buildResearchWorkbook(mockSummaries, mockStudents);

    expect(wb.SheetNames).toContain("Ringkasan Model Pembelajaran");
    expect(wb.SheetNames).toContain("Data Rinci Siswa & N-Gain");

    const summarySheet = wb.Sheets["Ringkasan Model Pembelajaran"];
    const summaryRows = XLSX.utils.sheet_to_json<string[]>(summarySheet, { header: 1 });
    expect(summaryRows[0]).toContain("Model Pembelajaran");
    expect(summaryRows[1]).toContain("Co-op Co-op + AI");

    const studentSheet = wb.Sheets["Data Rinci Siswa & N-Gain"];
    const studentRows = XLSX.utils.sheet_to_json<string[]>(studentSheet, { header: 1 });
    expect(studentRows[0]).toContain("Skor N-Gain");
    expect(studentRows[1]).toContain("Ahmad Siswa");
  });
});

