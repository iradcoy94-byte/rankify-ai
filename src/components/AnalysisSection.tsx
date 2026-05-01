import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Award, Target } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Student } from "@/lib/types";

interface AnalysisSectionProps {
  students: Student[];
}

const PASS = 68;

/**
 * AnalysisSection — high-level analytics across ALL classes.
 * Shows: per-class averages, pass/fail breakdown, top performers per class,
 * and overall completion ratio. Pure presentation; no data mutations.
 */
export function AnalysisSection({ students }: AnalysisSectionProps) {
  const valid = useMemo(() => students.filter((s) => s.isValid), [students]);

  /** Aggregate stats grouped by class label (or "Tanpa Kelas"). */
  const perClass = useMemo(() => {
    const map = new Map<
      string,
      { name: string; total: number; tuntas: number; sum: number; top?: Student }
    >();
    for (const s of valid) {
      const key = (s.className ?? "").trim() || "Tanpa Kelas";
      const cur = map.get(key) ?? { name: key, total: 0, tuntas: 0, sum: 0 };
      cur.total += 1;
      cur.sum += s.score;
      if (s.score >= PASS) cur.tuntas += 1;
      if (!cur.top || s.score > cur.top.score) cur.top = s;
      map.set(key, cur);
    }
    return Array.from(map.values())
      .map((c) => ({
        ...c,
        rata: Math.round((c.sum / Math.max(1, c.total)) * 10) / 10,
        belum: c.total - c.tuntas,
      }))
      .sort((a, b) => b.rata - a.rata);
  }, [valid]);

  const overall = useMemo(() => {
    const total = valid.length;
    const tuntas = valid.filter((s) => s.score >= PASS).length;
    const belum = total - tuntas;
    const avg =
      total === 0
        ? 0
        : Math.round((valid.reduce((a, s) => a + s.score, 0) / total) * 10) / 10;
    const tertinggi = valid.reduce<Student | null>(
      (a, s) => (a == null || s.score > a.score ? s : a),
      null,
    );
    const terendah = valid.reduce<Student | null>(
      (a, s) => (a == null || s.score < a.score ? s : a),
      null,
    );
    return { total, tuntas, belum, avg, tertinggi, terendah };
  }, [valid]);

  const pieData = [
    { name: "Tuntas", value: overall.tuntas, color: "hsl(var(--success))" },
    {
      name: "Belum Tuntas",
      value: overall.belum,
      color: "hsl(var(--destructive))",
    },
  ];

  if (valid.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Belum ada data valid untuk dianalisis. Upload daftar nilai terlebih dahulu.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Target className="h-4 w-4" />}
          label="Rata-rata Keseluruhan"
          value={overall.avg.toString()}
          tone="primary"
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Siswa Tuntas (≥68)"
          value={`${overall.tuntas} / ${overall.total}`}
          tone="success"
        />
        <KpiCard
          icon={<TrendingDown className="h-4 w-4" />}
          label="Siswa Belum Tuntas"
          value={overall.belum.toString()}
          tone="destructive"
        />
        <KpiCard
          icon={<Award className="h-4 w-4" />}
          label="Nilai Tertinggi"
          value={
            overall.tertinggi
              ? `${overall.tertinggi.score} · ${overall.tertinggi.name}`
              : "—"
          }
          tone="primary"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Bar chart per kelas */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-border bg-gradient-card p-5 shadow-card-soft"
        >
          <h4 className="mb-1 font-semibold">Rata-rata Nilai per Kelas</h4>
          <p className="mb-4 text-xs text-muted-foreground">
            Perbandingan capaian antar kelas
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={perClass}
              margin={{ top: 10, right: 8, left: -16, bottom: 0 }}
            >
              <defs>
                <linearGradient id="anaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--accent))" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
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
                }}
              />
              <Bar dataKey="rata" radius={[8, 8, 0, 0]} fill="url(#anaGrad)" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Pie ketuntasan */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-border bg-gradient-card p-5 shadow-card-soft"
        >
          <h4 className="mb-1 font-semibold">Ketuntasan Belajar</h4>
          <p className="mb-4 text-xs text-muted-foreground">
            KKM = 68
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
              >
                {pieData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Per-class detail table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-gradient-card shadow-card-soft">
        <div className="border-b border-border px-5 py-4">
          <h4 className="font-semibold">Ringkasan per Kelas</h4>
          <p className="text-xs text-muted-foreground">
            Rata-rata, ketuntasan, dan siswa terbaik dari masing-masing kelas
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Kelas</th>
                <th className="px-5 py-3">Siswa</th>
                <th className="px-5 py-3">Rata-rata</th>
                <th className="px-5 py-3">Tuntas</th>
                <th className="px-5 py-3">Belum Tuntas</th>
                <th className="px-5 py-3">Peringkat 1</th>
              </tr>
            </thead>
            <tbody>
              {perClass.map((c) => (
                <tr
                  key={c.name}
                  className="border-t border-border/60 hover:bg-secondary/30"
                >
                  <td className="px-5 py-3 font-semibold">{c.name}</td>
                  <td className="px-5 py-3 font-mono">{c.total}</td>
                  <td className="px-5 py-3 font-mono">{c.rata}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                      {c.tuntas}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
                      {c.belum}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {c.top ? (
                      <span>
                        <span className="font-medium">{c.top.name}</span>{" "}
                        <span className="text-muted-foreground">
                          · {c.top.score}
                        </span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "primary" | "success" | "destructive";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "destructive"
        ? "text-destructive"
        : "text-primary";
  return (
    <div className="rounded-2xl border border-border bg-gradient-card p-4 shadow-card-soft">
      <div className={`mb-2 inline-flex items-center gap-2 ${toneClass}`}>
        {icon}
        <span className="text-[11px] uppercase tracking-wide">{label}</span>
      </div>
      <p className="truncate text-lg font-bold">{value}</p>
    </div>
  );
}
