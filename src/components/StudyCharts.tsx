import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Student } from "@/lib/types";

interface Props {
  students: Student[];
}

/** Aggregate pretest & posttest per CLASS (avg). */
function aggregate(students: Student[]) {
  const valid = students.filter((s) => s.isValid);
  const map = new Map<
    string,
    { name: string; preSum: number; preN: number; postSum: number; postN: number }
  >();
  for (const s of valid) {
    const key = (s.className ?? "").trim() || "Tanpa Kelas";
    const cur = map.get(key) ?? {
      name: key,
      preSum: 0,
      preN: 0,
      postSum: 0,
      postN: 0,
    };
    if (typeof s.pretest === "number" && !Number.isNaN(s.pretest)) {
      cur.preSum += s.pretest;
      cur.preN += 1;
    }
    if (typeof s.posttest === "number" && !Number.isNaN(s.posttest)) {
      cur.postSum += s.posttest;
      cur.postN += 1;
    }
    map.set(key, cur);
  }
  return Array.from(map.values())
    .map((c) => ({
      name: c.name,
      Pretest: c.preN ? Math.round((c.preSum / c.preN) * 10) / 10 : 0,
      Posttest: c.postN ? Math.round((c.postSum / c.postN) * 10) / 10 : 0,
    }))
    .filter((d) => d.Pretest > 0 || d.Posttest > 0);
}

/** Bar chart Pretest vs Posttest per class. */
export function PrePostChart({ students }: Props) {
  const data = useMemo(() => aggregate(students), [students]);
  if (data.length === 0) {
    return (
      <EmptyHint>
        Isi kolom <strong>Pretest</strong> & <strong>Posttest</strong> di tabel
        ranking untuk melihat perbandingan.
      </EmptyHint>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 12,
            color: "hsl(var(--foreground))",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "hsl(var(--foreground))" }} />
        <Bar dataKey="Pretest" fill="hsl(var(--muted-foreground))" radius={[6, 6, 0, 0]} />
        <Bar dataKey="Posttest" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Gain score = posttest - pretest, per class. Bars colored by sign. */
export function GainScoreChart({ students }: Props) {
  const data = useMemo(() => {
    return aggregate(students).map((d) => ({
      name: d.name,
      gain: Math.round((d.Posttest - d.Pretest) * 10) / 10,
    }));
  }, [students]);

  if (data.length === 0) {
    return (
      <EmptyHint>
        Gain score akan muncul setelah pretest dan posttest terisi.
      </EmptyHint>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 12,
            color: "hsl(var(--foreground))",
          }}
        />
        <Bar dataKey="gain" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={
                d.gain >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Effectiveness per learning model — average score & % tuntas. */
export function ModelEffectivenessChart({ students }: Props) {
  const data = useMemo(() => {
    const valid = students.filter((s) => s.isValid);
    const map = new Map<
      string,
      { name: string; sum: number; n: number; tuntas: number }
    >();
    for (const s of valid) {
      const key = s.model ?? "Belum diatur";
      const cur = map.get(key) ?? { name: key, sum: 0, n: 0, tuntas: 0 };
      cur.sum += s.score;
      cur.n += 1;
      if (s.score >= 68) cur.tuntas += 1;
      map.set(key, cur);
    }
    return Array.from(map.values()).map((c) => ({
      name: c.name,
      "Rata-rata": Math.round((c.sum / Math.max(1, c.n)) * 10) / 10,
      "% Tuntas": Math.round((c.tuntas / Math.max(1, c.n)) * 100),
    }));
  }, [students]);

  if (data.length === 0) {
    return (
      <EmptyHint>
        Isi kolom <strong>Model</strong> di tabel ranking (Co-op Co-op + AI,
        Co-op Co-op, atau Konvensional) untuk membandingkan efektivitas.
      </EmptyHint>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 12,
            color: "hsl(var(--foreground))",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "hsl(var(--foreground))" }} />
        <Bar dataKey="Rata-rata" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
        <Bar dataKey="% Tuntas" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-[220px] place-items-center rounded-xl border border-dashed border-border px-6 text-center text-sm text-muted-foreground">
      <p>{children}</p>
    </div>
  );
}
