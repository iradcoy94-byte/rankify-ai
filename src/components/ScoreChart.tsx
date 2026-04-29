import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Student } from "@/lib/types";

interface ScoreChartProps {
  students: Student[];
}

/**
 * Bar chart of valid scores. Compact, fits inside the stats card.
 */
export function ScoreChart({ students }: ScoreChartProps) {
  const data = useMemo(
    () =>
      students
        .filter((s) => s.isValid)
        .sort((a, b) => b.score - a.score)
        .map((s) => ({
          name: s.name.length > 10 ? s.name.slice(0, 9) + "…" : s.name,
          nilai: s.score,
        })),
    [students],
  );

  if (data.length === 0) {
    return (
      <div className="grid h-full min-h-[180px] place-items-center text-sm text-muted-foreground">
        Grafik akan muncul setelah ada data valid.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="name"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--border))" }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--border))" }}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--secondary) / 0.4)" }}
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 12,
            color: "hsl(var(--foreground))",
          }}
        />
        <Bar dataKey="nilai" radius={[8, 8, 0, 0]} fill="url(#barGrad)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
