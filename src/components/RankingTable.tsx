import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  AlertTriangle,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Student } from "@/lib/types";

interface RankingTableProps {
  students: Student[];
  onUpdate: (
    id: string,
    patch: Partial<Pick<Student, "name" | "score">>,
  ) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}

type SortDir = "rank" | "score-asc" | "score-desc" | "name";

/**
 * Editable ranking table with sorting, inline edit, and validation highlight.
 * Default sort = by computed dense rank.
 */
export function RankingTable({
  students,
  onUpdate,
  onRemove,
  onAdd,
}: RankingTableProps) {
  const [sort, setSort] = useState<SortDir>("rank");

  const sorted = useMemo(() => {
    const list = [...students];
    switch (sort) {
      case "score-asc":
        return list.sort((a, b) => (a.score || 0) - (b.score || 0));
      case "score-desc":
        return list.sort((a, b) => (b.score || 0) - (a.score || 0));
      case "name":
        return list.sort((a, b) => a.name.localeCompare(b.name));
      default:
        // by rank, invalid (rank 0) at bottom
        return list.sort((a, b) => {
          if (a.rank === 0 && b.rank !== 0) return 1;
          if (b.rank === 0 && a.rank !== 0) return -1;
          return a.rank - b.rank;
        });
    }
  }, [students, sort]);

  const toggleScoreSort = () => {
    setSort((s) => (s === "score-desc" ? "score-asc" : "score-desc"));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-gradient-card shadow-card-soft">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="font-semibold">Tabel Ranking</h3>
          <p className="text-xs text-muted-foreground">
            Klik sel untuk mengedit · perubahan otomatis tersimpan
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" /> Tambah baris
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-20 px-5 py-3">
                <button
                  onClick={() => setSort("rank")}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Rank <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-5 py-3">
                <button
                  onClick={() => setSort("name")}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Nama <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="w-40 px-5 py-3">
                <button
                  onClick={toggleScoreSort}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Nilai{" "}
                  {sort === "score-asc" ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : sort === "score-desc" ? (
                    <ArrowDown className="h-3 w-3" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3" />
                  )}
                </button>
              </th>
              <th className="w-32 px-5 py-3">Status</th>
              <th className="w-12 px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {sorted.map((s) => (
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
                  <td className="px-5 py-3">
                    <RankBadge rank={s.rank} valid={s.isValid} />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={s.name}
                      onChange={(e) =>
                        onUpdate(s.id, { name: e.target.value })
                      }
                      placeholder="Nama siswa"
                      className="h-9 border-transparent bg-transparent focus:border-primary focus:bg-background"
                    />
                  </td>
                  <td className="px-3 py-2">
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
                      className={`h-9 w-28 font-mono border-transparent bg-transparent focus:border-primary focus:bg-background ${
                        !s.isValid ? "text-destructive" : ""
                      }`}
                    />
                  </td>
                  <td className="px-5 py-3">
                    {s.isValid ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
                        <Check className="h-3 w-3" /> Valid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-medium text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        {s.error ?? "Invalid"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => onRemove(s.id)}
                      className="rounded-md p-2 text-muted-foreground transition-smooth hover:bg-destructive/15 hover:text-destructive"
                      aria-label="Hapus baris"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-12 text-center text-sm text-muted-foreground"
                >
                  Belum ada data. Upload gambar atau tambah baris manual.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
