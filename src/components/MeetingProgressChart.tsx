import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
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
  /** When true, draw a separate line per student (used in per-student trajectory). */
  perStudent?: boolean;
  /** When true, draw one line per learning model / class group. */
  byGroup?: boolean;
}

/**
 * Average score per pertemuan (meeting). Defaults to one line for the whole
 * dataset's average. When perStudent=true, draws one line per student. When
 * byGroup=true, draws one line per learning model (or className fallback).
 */
export function MeetingProgressChart({
  students,
  height = 260,
  perStudent = false,
  byGroup = false,
}: Props) {
  const valid = students.filter((s) => s.isValid);

  // Determine all meeting numbers present (default = 1).
  const meetings = useMemo(() => {
    const set = new Set<number>();
    for (const s of valid) set.add(s.meeting ?? 1);
    return Array.from(set).sort((a, b) => a - b);
  }, [valid]);

  const groupKey = (s: Student) =>
    s.model ?? (s.className?.trim() || "Tanpa Kelompok");

  const data = useMemo(() => {
    if (perStudent) {
      const byStudent = new Map<string, Map<number, number[]>>();
      for (const s of valid) {
        const m = s.meeting ?? 1;
        if (!byStudent.has(s.name)) byStudent.set(s.name, new Map());
        const map = byStudent.get(s.name)!;
        if (!map.has(m)) map.set(m, []);
        map.get(m)!.push(s.score);
      }
      return meetings.map((m) => {
        const row: Record<string, number | string> = { meeting: `P${m}` };
        for (const [name, map] of byStudent) {
          const arr = map.get(m);
          if (arr && arr.length) {
            row[name] =
              Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) /
              10;
          }
        }
        return row;
      });
    }

    if (byGroup) {
      const groups = new Map<string, Map<number, number[]>>();
      for (const s of valid) {
        const k = groupKey(s);
        const m = s.meeting ?? 1;
        if (!groups.has(k)) groups.set(k, new Map());
        const map = groups.get(k)!;
        if (!map.has(m)) map.set(m, []);
        map.get(m)!.push(s.score);
      }
      return meetings.map((m) => {
        const row: Record<string, number | string> = { meeting: `P${m}` };
        for (const [name, map] of groups) {
          const arr = map.get(m);
          if (arr && arr.length) {
            row[name] =
              Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) /
              10;
          }
        }
        return row;
      });
    }

    // Aggregate average across the whole class per meeting.
    return meetings.map((m) => {
      const rows = valid.filter((s) => (s.meeting ?? 1) === m);
      const avg =
        rows.length === 0
          ? 0
          : Math.round(
              (rows.reduce((a, b) => a + b.score, 0) / rows.length) * 10,
            ) / 10;
      return { meeting: `P${m}`, "Rata-rata": avg, jumlah: rows.length };
    });
  }, [valid, meetings, perStudent, byGroup]);

  if (valid.length === 0 || meetings.length === 0) {
    return (
      <div className="grid h-full min-h-[200px] place-items-center text-sm text-muted-foreground">
        Belum ada data nilai untuk grafik perkembangan.
      </div>
    );
  }

  if (meetings.length < 2) {
    return (
      <div className="grid h-full min-h-[200px] place-items-center px-6 text-center text-sm text-muted-foreground">
        Tambahkan data untuk minimal <strong>2 pertemuan</strong> (atur kolom
        "Pertemuan" di tabel) untuk melihat perkembangan.
      </div>
    );
  }

  // Color palette for per-student lines (cycled).
  const palette = [
    "hsl(var(--primary))",
    "hsl(var(--accent))",
    "hsl(var(--success))",
    "hsl(var(--warning))",
    "hsl(var(--destructive))",
    "hsl(var(--primary-glow))",
  ];

  // For perStudent mode collect names from the first row's keys.
  const studentNames = perStudent
    ? Object.keys(data[0]).filter((k) => k !== "meeting")
    : [];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="meeting"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 12,
            color: "hsl(var(--foreground))",
          }}
        />
        {perStudent ? (
          <>
            <Legend wrapperStyle={{ fontSize: 11, color: "hsl(var(--foreground))" }} />
            {studentNames.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={palette[i % palette.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </>
        ) : (
          <Line
            type="monotone"
            dataKey="Rata-rata"
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            dot={{ r: 5, fill: "hsl(var(--accent))", strokeWidth: 0 }}
            activeDot={{ r: 7 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
