function readSqlValue(raw: string): unknown {
  const value = raw.trim();
  if (/^null$/i.test(value)) return null;
  if (value.startsWith("'") && value.endsWith("'")) {
    const content = value.slice(1, -1);
    let decoded = "";
    for (let index = 0; index < content.length; index += 1) {
      const char = content[index];
      if (char === "\\" && index + 1 < content.length) {
        index += 1;
        const escaped = content[index];
        decoded += ({ n: "\n", r: "\r", t: "\t", 0: "\0" } as Record<string, string>)[escaped] ?? escaped;
      } else if (char === "'" && content[index + 1] === "'") {
        decoded += "'";
        index += 1;
      } else decoded += char;
    }
    return decoded;
  }
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function parseTupleValues(statement: string): unknown[][] {
  const rows: unknown[][] = [];
  let index = 0;
  while (index < statement.length) {
    while (/[\s,]/.test(statement[index] ?? "")) index += 1;
    if (index >= statement.length) break;
    if (statement[index] !== "(") throw new Error("Format INSERT pada dump MySQL tidak dikenali.");
    index += 1;
    const values: unknown[] = [];
    let token = "";
    let quoted = false;
    while (index < statement.length) {
      const char = statement[index];
      if (char === "\\" && quoted) {
        token += char + (statement[index + 1] ?? "");
        index += 2;
        continue;
      }
      if (char === "'") {
        token += char;
        if (quoted && statement[index + 1] === "'") {
          token += statement[index + 1];
          index += 2;
          continue;
        }
        quoted = !quoted;
        index += 1;
        continue;
      }
      if (!quoted && (char === "," || char === ")")) {
        values.push(readSqlValue(token));
        token = "";
        index += 1;
        if (char === ")") break;
        continue;
      }
      token += char;
      index += 1;
    }
    if (quoted) throw new Error("String pada dump MySQL tidak tertutup.");
    rows.push(values);
  }
  return rows;
}

function statementEnd(source: string, start: number) {
  let quoted = false;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === "\\" && quoted) { index += 1; continue; }
    if (source[index] === "'") {
      if (quoted && source[index + 1] === "'") { index += 1; continue; }
      quoted = !quoted;
    } else if (source[index] === ";" && !quoted) return index;
  }
  return source.length;
}

/** Reads the students INSERT statements from a MySQL text dump. */
export function parseMySqlStudentsDump(source: string): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const insertPattern = /insert\s+into\s+`?students`?\s*(?:\(([^)]*)\))?\s*values\s*/ig;
  let match: RegExpExecArray | null;
  while ((match = insertPattern.exec(source))) {
    const columns = match[1]
      ? match[1].split(",").map((column) => column.trim().replace(/^[`"]|[`"]$/g, "").toLowerCase())
      : ["id", "name", "score", "class_name", "meeting", "model", "pretest", "posttest", "kind", "created_at", "updated_at"];
    const valuesStart = insertPattern.lastIndex;
    const valuesEnd = statementEnd(source, valuesStart);
    for (const tuple of parseTupleValues(source.slice(valuesStart, valuesEnd))) {
      if (tuple.length !== columns.length) throw new Error("Jumlah kolom dan nilai pada dump MySQL berbeda.");
      rows.push(Object.fromEntries(columns.map((column, index) => [column, tuple[index]])));
    }
    insertPattern.lastIndex = valuesEnd + 1;
  }
  return rows;
}
