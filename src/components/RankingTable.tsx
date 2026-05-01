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
    patch: Partial<Pick<Student, "name" | "score" | "className">>,
  ) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}

type SortKey = "rank" | "name" | "score" | "class";
type SortDir = "asc" | "desc";

/**
 * Editable ranking table with column-toggle sorting (asc ⇄ desc), inline
 * edit, and validation highlight. Default sort = by computed dense rank.
 */
export function RankingTable({
  students,
  onUpdate,
  onRemove,
  onAdd,
}: RankingTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  /** Click a header: toggle dir if same column, else switch column with sane default. */
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Sensible defaults: rank ascending (1 first), score descending (high first), name A→Z
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
        case "rank":
        default: {
          // invalid (rank 0) always at the bottom regardless of direction
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
                  onClick={() => handleSort("rank")}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Rank <SortIcon active={sortKey === "rank"} />
                </button>
              </th>
              <th className="w-32 px-3 py-3">
                <button
                  onClick={() => handleSort("class")}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Kelas <SortIcon active={sortKey === "class"} />
                </button>
              </th>
              <th className="px-5 py-3">
                <button
                  onClick={() => handleSort("name")}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Nama <SortIcon active={sortKey === "name"} />
                </button>
              </th>
              <th className="w-32 px-5 py-3">
                <button
                  onClick={() => handleSort("score")}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Nilai <SortIcon active={sortKey === "score"} />
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
                      value={s.className ?? ""}
                      onChange={(e) =>
                        onUpdate(s.id, { className: e.target.value })
                      }
                      placeholder="cth: XII IPA 1"
                      className="h-9 w-28 border-transparent bg-transparent uppercase focus:border-primary focus:bg-background"
                    />
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
                      className={`h-9 w-24 font-mono border-transparent bg-transparent focus:border-primary focus:bg-background ${
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
                  colSpan={6}
                  className="px-5 py-12 text-center text-sm text-muted-foreground"
                >
                  Belum ada data nih... Coba upload dulu gambarnya atau tambah data secara manual.
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
