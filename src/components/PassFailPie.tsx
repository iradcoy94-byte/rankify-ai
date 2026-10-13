import { useMemo } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { Student } from "@/lib/types";

interface Props {
  students: Student[];
  threshold?: number | Record<string, number>;
  height?: number;
}

/** Pie chart of pass / fail (Tuntas vs Belum Tuntas). */
export function PassFailPie({ students, threshold = 68, height = 220 }: Props) {
  const data = useMemo(() => {
    const valid = students.filter((s) => s.isValid);
    const tuntas = valid.filter((s) => s.score >= (typeof threshold === "number" ? threshold : threshold[s.className ?? ""] ?? 68)).length;
    const belum = valid.length - tuntas;
    return [
      { name: "Tuntas", value: tuntas, color: "hsl(var(--success))" },
      { name: "Belum Tuntas", value: belum, color: "hsl(var(--destructive))" },
    ];
  }, [students, threshold]);

  const total = data[0].value + data[1].value;

  if (total === 0) {
    return (
      <div className="grid h-full min-h-[180px] place-items-center text-sm text-muted-foreground">
        Pie ketuntasan akan muncul setelah ada data valid.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={3}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 12,
            color: "hsl(var(--foreground))",
          }}
        />
        <Legend wrapperStyle={{ color: "hsl(var(--foreground))", fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
