import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Student } from "@/lib/types";

interface Props {
  students: Student[];
  height?: number;
}

/**
 * Distribusi nilai — line chart of every valid score sorted descending.
 * Names are NOT shown on the X axis (clean look) but appear in the tooltip
 * when hovering / clicking a point.
 */
export function ScoreDistributionLine({ students, height = 240 }: Props) {
  const data = useMemo(
    () =>
      students
        .filter((s) => s.isValid)
        .sort((a, b) => b.score - a.score)
        .map((s, i) => ({
          idx: i + 1,
          name: s.name,
          nilai: s.score,
          kelas: s.className ?? "-",
        })),
    [students],
  );

  if (data.length === 0) {
    return (
      <div className="grid h-full min-h-[180px] place-items-center text-sm text-muted-foreground">
        Distribusi akan muncul setelah ada data valid.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="distGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="idx"
          tick={false}
          axisLine={{ stroke: "hsl(var(--border))" }}
          tickLine={false}
          label={{
            value: "Peringkat (tertinggi → terendah)",
            position: "insideBottom",
            offset: -2,
            fill: "hsl(var(--muted-foreground))",
            fontSize: 11,
          }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--border))" }}
        />
        <Tooltip
          cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1 }}
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 12,
            color: "hsl(var(--foreground))",
          }}
          formatter={(value: number) => [value, "Nilai"]}
          labelFormatter={(_, payload) => {
            const p = payload?.[0]?.payload as
              | { name: string; kelas: string }
              | undefined;
            if (!p) return "";
            return `${p.name} · ${p.kelas}`;
          }}
        />
        <Line
          type="monotone"
          dataKey="nilai"
          stroke="url(#distGrad)"
          strokeWidth={3}
          dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }}
          activeDot={{ r: 6, fill: "hsl(var(--accent))" }}
          isAnimationActive
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
