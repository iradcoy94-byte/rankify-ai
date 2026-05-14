import { Fragment as FragmentWithKey, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  XCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Student, LearningModel } from "@/lib/types";
import { LEARNING_MODELS } from "@/lib/types";

/** Threshold KKM: ≥ 68 → Tuntas, < 68 → Belum Tuntas */
const PASS_THRESHOLD = 68;

/** Shorten class label for compact display in the table. */
function abbrevClass(c?: string): string {
  if (!c) return "—";
  const u = c.toUpperCase().trim();
  if (u.includes("EKSPERIMEN 1") || u === "EKSP 1" || u === "EKSP1") return "EKSP 1";
  if (u.includes("EKSPERIMEN 2") || u === "EKSP 2" || u === "EKSP2") return "EKSP 2";
  if (u.includes("KONVENSIONAL") || u === "KONV") return "KONV";
  return c;
}

interface RankingTableProps {
  students: Student[];
  onUpdate: (
    id: string,
    patch: Partial<
      Pick<
        Student,
        "name" | "score" | "className" | "meeting" | "model" | "pretest" | "posttest"
      >
    >,
  ) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  /** Hide the "Kelas" column (used when viewing a single class). */
  hideClass?: boolean;
  /** Available meeting options for the in-table filter. */
  meetingOptions?: number[];
  /** Currently selected meeting ('all' = show all). */
  meetingFilter?: number | "all";
  /** Notifies parent when meeting filter changes. */
  onMeetingFilterChange?: (val: number | "all") => void;
}

type SortKey = "rank" | "name" | "score" | "class" | "meeting";
type SortDir = "asc" | "desc";

/**
 * Editable ranking table. Each row has an expandable section for Model,
 * Pretest, and Posttest so the main table stays readable.
 */
export function RankingTable({
  students,
  onUpdate,
  onRemove,
  onAdd,
  hideClass = false,
  meetingOptions,
  meetingFilter,
  onMeetingFilterChange,
}: RankingTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
      next.add(id);
      }

      return next;
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "score" ? "desc" : "asc");
    }
  };

  const sorted = useMemo(() => {
    const list = [...students];
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name, "id") * dir;
        case "score": {
          const av = Number.isNaN(a.score) ? -Infinity : a.score;
          const bv = Number.isNaN(b.score) ? -Infinity : b.score;
          return (av - bv) * dir;
        }
        case "class":
          return (a.className ?? "").localeCompare(b.className ?? "", "id") * dir;
        case "meeting":
          return ((a.meeting ?? 1) - (b.meeting ?? 1)) * dir;
        case "rank":
        default: {
          if (a.rank === 0 && b.rank !== 0) return 1;
          if (b.rank === 0 && a.rank !== 0) return -1;
          return (a.rank - b.rank) * dir;
        }
      }
    });
    return list;
  }, [students, sortKey, sortDir]);

  const SortIcon = ({ active }: { active: boolean }) => {
    if (!active) return <ArrowUpDown className="h-3 w-3" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  const colCount = (hideClass ? 5 : 6) + 2; // expand + meeting cols

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-gradient-card shadow-card-soft">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="font-semibold">Tabel Ranking</h3>
          <p className="text-xs text-muted-foreground">
            Klik panah untuk mengisi Model, Pretest & Posttest · perubahan
            otomatis tersimpan
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {meetingOptions && meetingOptions.length > 0 && onMeetingFilterChange && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-2 py-1 backdrop-blur">
              <CalendarDays className="ml-1 h-3.5 w-3.5 text-primary" />
              <Select
                value={String(meetingFilter ?? "all")}
                onValueChange={(v) =>
                  onMeetingFilterChange(v === "all" ? "all" : Number(v))
                }
              >
                <SelectTrigger className="h-8 w-[160px] border-0 bg-transparent text-xs focus:ring-0">
                  <SelectValue placeholder="Pilih pertemuan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua pertemuan</SelectItem>
                  {meetingOptions.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      Pertemuan {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4" /> Tambah baris
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-foreground/70">
            <tr>
              <th className="w-8 px-3 py-3"></th>
              <th className="w-20 px-3 py-3">
                <button
                  onClick={() => handleSort("rank")}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Rank <SortIcon active={sortKey === "rank"} />
                </button>
              </th>
              {!hideClass && (
                <th className="w-24 px-3 py-3 text-left">
                  <button
                    onClick={() => handleSort("class")}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Kelas <SortIcon active={sortKey === "class"} />
                  </button>
                </th>
              )}
              <th className="px-3 py-3 text-left">
                <button
                  onClick={() => handleSort("name")}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Nama <SortIcon active={sortKey === "name"} />
                </button>
              </th>
              <th className="w-24 px-3 py-3 text-center">
                <button
                  onClick={() => handleSort("meeting")}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Pertemuan <SortIcon active={sortKey === "meeting"} />
                </button>
              </th>
              <th className="w-28 px-3 py-3 text-center">
                <button
                  onClick={() => handleSort("score")}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Nilai <SortIcon active={sortKey === "score"} />
                </button>
              </th>
              <th className="w-32 px-3 py-3">Status</th>
              <th className="w-12 px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {sorted.map((s) => {
                const isOpen = expanded.has(s.id);
                return (
                  <FragmentWithKey key={s.id}>
                    <motion.tr
                      key={s.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className={`border-t border-border/60 transition-smooth hover:bg-secondary/30 ${
                        !s.isValid ? "bg-destructive/5" : ""
                      }`}
                    >
                      <td className="px-2 py-2">
                        <button
                          onClick={() => toggleExpand(s.id)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                          aria-label="Detail siswa"
                        >
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <RankBadge rank={s.rank} valid={s.isValid} />
                      </td>
                      {!hideClass && (
                        <td className="px-3 py-2 text-left">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default text-sm text-foreground">
                                {abbrevClass(s.className)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {s.className?.trim() ? s.className : "Tanpa kelas"}
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      )}
                      <td className="px-3 py-2 text-left">
                        <Input
                          value={s.name}
                          onChange={(e) =>
                            onUpdate(s.id, { name: e.target.value })
                          }
                          placeholder="Nama siswa"
                          className="h-9 border-transparent bg-transparent px-0 text-left focus:border-primary focus:bg-background"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Input
                          type="number"
                          min={1}
                          value={s.meeting ?? 1}
                          onChange={(e) =>
                            onUpdate(s.id, {
                              meeting:
                                e.target.value === ""
                                  ? 1
                                  : Math.max(1, Number(e.target.value)),
                            })
                          }
                          className="mx-auto h-9 w-16 text-center font-mono border-transparent bg-transparent focus:border-primary focus:bg-background"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={Number.isNaN(s.score) ? "" : s.score}
                          onChange={(e) => {
                            const v = e.target.value;
                            onUpdate(s.id, {
                              score: v === "" ? NaN : Number(v),
                            });
                          }}
                          placeholder="0–100"
                          className={`mx-auto h-9 w-20 text-center font-mono border-transparent bg-transparent focus:border-primary focus:bg-background ${
                            !s.isValid ? "text-destructive" : ""
                          }`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        {!s.isValid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            —
                          </span>
                        ) : s.score >= PASS_THRESHOLD ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                            <CheckCircle2 className="h-3 w-3" /> Tuntas
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-semibold text-destructive">
                            <XCircle className="h-3 w-3" /> Belum Tuntas
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => onRemove(s.id)}
                          className="rounded-md p-2 text-muted-foreground transition-smooth hover:bg-destructive/15 hover:text-destructive"
                          aria-label="Hapus baris"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </motion.tr>

                    {isOpen && (
                      <motion.tr
                        key={s.id + "-detail"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-t border-border/40 bg-secondary/20"
                      >
                        <td colSpan={colCount} className="px-5 py-4">
                          <div className="grid gap-3 sm:grid-cols-3">
                            <DetailField label="Model Pembelajaran">
                              <Select
                                value={s.model ?? ""}
                                onValueChange={(v) =>
                                  onUpdate(s.id, { model: v as LearningModel })
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Pilih model…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {LEARNING_MODELS.map((m) => (
                                    <SelectItem key={m} value={m}>
                                      {m}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </DetailField>
                            <DetailField label="Pretest (0–100)">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={
                                  s.pretest === undefined ||
                                  Number.isNaN(s.pretest)
                                    ? ""
                                    : s.pretest
                                }
                                onChange={(e) => {
                                  const v = e.target.value;
                                  onUpdate(s.id, {
                                    pretest: v === "" ? undefined : Number(v),
                                  });
                                }}
                                className="h-9 font-mono"
                                placeholder="—"
                              />
                            </DetailField>
                            <DetailField label="Posttest (0–100)">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={
                                  s.posttest === undefined ||
                                  Number.isNaN(s.posttest)
                                    ? ""
                                    : s.posttest
                                }
                                onChange={(e) => {
                                  const v = e.target.value;
                                  onUpdate(s.id, {
                                    posttest: v === "" ? undefined : Number(v),
                                  });
                                }}
                                className="h-9 font-mono"
                                placeholder="—"
                              />
                            </DetailField>
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </FragmentWithKey>
                );
              })}
            </AnimatePresence>
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-5 py-12 text-center text-sm text-muted-foreground"
                >
                  Belum ada data nih... Coba upload dulu gambarnya atau tambah
                  data secara manual.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function RankBadge({ rank, valid }: { rank: number; valid: boolean }) {
  if (!valid || rank === 0) {
    return (
      <span className="inline-grid h-9 w-9 place-items-center rounded-lg bg-muted text-xs text-muted-foreground">
        —
      </span>
    );
  }
  const styles =
    rank === 1
      ? "bg-gradient-gold text-background shadow-gold"
      : rank === 2
        ? "bg-gradient-silver text-background"
        : rank === 3
          ? "bg-gradient-bronze text-background"
          : "bg-secondary text-foreground";
  return (
    <span
      className={`inline-grid h-9 w-9 place-items-center rounded-lg font-bold ${styles}`}
    >
      {rank}
    </span>
  );
}
