import { describe, expect, it } from "vitest";
import { parseMySqlStudentsDump } from "@/services/legacyImportService";

describe("parseMySqlStudentsDump", () => {
  it("reads students insert rows and decodes escaped text", () => {
    const dump = "INSERT INTO `students` (`id`,`name`,`score`,`class_name`,`kind`) VALUES ('r1','Dwi \\'Ayu\\'\\nPutri',82,'Eksperimen 1','meeting'),('r2','Budi',NULL,'Eksperimen 1','pretest');";
    const rows = parseMySqlStudentsDump(dump);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: "r1", name: "Dwi 'Ayu'\nPutri", score: 82, kind: "meeting" });
    expect(rows[1].score).toBeNull();
  });

  it("supports mysqldump statements that omit the column list", () => {
    const rows = parseMySqlStudentsDump("INSERT INTO students VALUES ('r1','Ani',90,'Kelas 1',1,'Co-op',NULL,NULL,'meeting','2026-01-01','2026-01-01');");
    expect(rows[0]).toMatchObject({ id: "r1", name: "Ani", score: 90, class_name: "Kelas 1", meeting: 1 });
  });
});
