import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Student } from "@/lib/types";

interface Props {
  students: Student[];
  groupByModel?: boolean;
}

/**
 * N-Gain (Hake) per learning model.
 * Per-student g = (post - pre) / (100 - pre); aggregated by model (mean).
 * Interpretation:
 *   g ≥ 0.7  → Tinggi
 *   0.3 ≤ g < 0.7 → Sedang
 *   g < 0.3  → Rendah
 */
export function NGainChart({ students, groupByModel = true }: Props) {
  const data = useMemo(() => {
    const groups = new Map<string, number[]>();
    const byStudent = new Map<string, { model: string; pre?: number; post?: number }>();
    for (const s of students) {
      const studentKey = s.studentId ?? `${s.name.trim().toLowerCase()}__${s.className ?? ""}`;
      const entry = byStudent.get(studentKey) ?? {
        model: groupByModel ? s.model ?? (s.className?.trim() || "Tanpa Kelompok") : "Keseluruhan",
      };
      if (s.kind === "pretest") entry.pre = s.score;
      if (s.kind === "posttest") entry.post = s.score;
      if (typeof s.pretest === "number") entry.pre = s.pretest;
      if (typeof s.posttest === "number") entry.post = s.posttest;
      byStudent.set(studentKey, entry);
    }
    for (const entry of byStudent.values()) {
      const { model } = entry;
      const key = model;
      const pre = typeof entry.pre === "number" && !Number.isNaN(entry.pre) ? entry.pre : null;
      const post = typeof entry.post === "number" && !Number.isNaN(entry.post) ? entry.post : null;
      if (pre === null || post === null) continue;
      if (pre >= 100) continue; // avoid divide-by-zero
      const g = (post - pre) / (100 - pre);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(g);
    }
    return Array.from(groups.entries()).map(([name, arr]) => {
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      return {
        name,
        ngain: Math.round(mean * 1000) / 1000,
        n: arr.length,
        kategori:
          mean >= 0.7 ? "Tinggi" : mean >= 0.3 ? "Sedang" : "Rendah",
      };
    });
  }, [students, groupByModel]);

  if (data.length === 0) {
    return (
      <div className="grid h-[220px] place-items-center rounded-xl border border-dashed border-border px-6 text-center text-sm text-muted-foreground">
        Isi nilai <strong>Pretest</strong> &amp; <strong>Posttest</strong> serta{" "}
        <strong>Model Pembelajaran</strong> pada tabel ranking untuk menghitung
        N-Gain.
      </div>
    );
  }

  const colorFor = (g: number) =>
    g >= 0.7
      ? "hsl(var(--success))"
      : g >= 0.3
        ? "hsl(var(--primary))"
        : "hsl(var(--destructive))";

  return (
    <>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          margin={{ top: 16, right: 8, left: -16, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="name"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          />
          <YAxis
            domain={[0, 1]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              color: "hsl(var(--foreground))",
            }}
            formatter={(v: number, _n, p) => [
              `${v.toFixed(3)} (${p.payload.kategori})`,
              "N-Gain",
            ]}
          />
          <Bar dataKey="ngain" radius={[6, 6, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={colorFor(d.ngain)} />
            ))}
            <LabelList
              dataKey="ngain"
              position="top"
              formatter={(v: number) => v.toFixed(2)}
              style={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
        {data.map((d) => (
          <div
            key={d.name}
            className="rounded-lg border border-border bg-background/50 p-2"
          >
            <div className="font-semibold text-foreground">{d.name}</div>
            <div className="text-muted-foreground">
              N-Gain rata-rata:{" "}
              <span className="font-mono text-foreground">
                {d.ngain.toFixed(3)}
              </span>{" "}
              · <span className="text-foreground">{d.kategori}</span> · n={d.n}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Rumus: <code>g = (Posttest − Pretest) / (100 − Pretest)</code>. Kategori
        Hake: g ≥ 0.7 Tinggi · 0.3 ≤ g &lt; 0.7 Sedang · g &lt; 0.3 Rendah.
      </p>
    </>
  );
}
