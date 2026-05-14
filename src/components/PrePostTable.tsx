import { useMemo } from "react";
import { CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Student } from "@/lib/types";

const PASS_THRESHOLD = 68;

function abbrevClass(c?: string): string {
  if (!c) return "—";
  const u = c.toUpperCase().trim();
  if (u.includes("EKSPERIMEN 1") || u === "EKSP 1" || u === "EKSP1") return "EKSP 1";
  if (u.includes("EKSPERIMEN 2") || u === "EKSP 2" || u === "EKSP2") return "EKSP 2";
  if (u.includes("KONVENSIONAL") || u === "KONV") return "KONV";
  return c;
}

interface Props {
  students: Student[];
  /** "pretest" or "posttest" — determines which rows to show & which field to edit. */
  kind: "pretest" | "posttest";
  onUpdate: (
    id: string,
    patch: Partial<
      Pick<Student, "name" | "score" | "className" | "pretest" | "posttest">
    >,
  ) => void;
  onRemove: (id: string) => void;
  hideClass?: boolean;
}

/**
 * Dedicated table for pre-test or post-test scores.
 * Filters students whose `kind` matches; falls back to checking the
 * pretest/posttest fields for legacy rows.
 */
export function PrePostTable({
  students,
  kind,
  onUpdate,
  onRemove,
  hideClass = false,
}: Props) {
  const rows = useMemo(() => {
    return students.filter((s) => {
      if (s.kind === kind) return true;
      if (kind === "pretest" && s.pretest !== undefined && s.kind === undefined)
        return true;
      if (kind === "posttest" && s.posttest !== undefined && s.kind === undefined)
        return true;
      return false;
    });
  }, [students, kind]);

  const title = kind === "pretest" ? "Nilai Pre-test" : "Nilai Post-test";
  const colCount = (hideClass ? 3 : 4) + 1;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-gradient-card shadow-card-soft">
      <div className="border-b border-border px-5 py-4">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">
          Tabel khusus untuk nilai {kind === "pretest" ? "pre-test" : "post-test"}{" "}
          — terpisah dari nilai pertemuan.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-foreground/70">
            <tr>
              <th className="w-12 px-3 py-3">No</th>
              {!hideClass && <th className="w-40 px-3 py-3">Kelas</th>}
              <th className="min-w-[240px] px-3 py-3 text-left">Nama</th>
              <th className="w-28 px-3 py-3">Nilai</th>
              <th className="w-32 px-3 py-3">Status</th>
              <th className="w-12 px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => {
              const value =
                kind === "pretest"
                  ? (s.pretest ?? (Number.isNaN(s.score) ? undefined : s.score))
                  : (s.posttest ?? (Number.isNaN(s.score) ? undefined : s.score));
              const numeric = typeof value === "number" && !Number.isNaN(value);
              const passed = numeric && value! >= PASS_THRESHOLD;
              return (
                <tr
                  key={s.id}
                  className="border-t border-border/60 hover:bg-secondary/30"
                >
                  <td className="px-3 py-2 font-mono text-muted-foreground">
                    {i + 1}
                  </td>
                  {!hideClass && (
                    <td className="px-3 py-2">
                      <Input
                        value={s.className ?? ""}
                        onChange={(e) =>
                          onUpdate(s.id, { className: e.target.value })
                        }
                        className="h-9 border-transparent bg-transparent uppercase focus:border-primary focus:bg-background"
                      />
                    </td>
                  )}
                  <td className="px-3 py-2">
                    <Input
                      value={s.name}
                      onChange={(e) => onUpdate(s.id, { name: e.target.value })}
                      className="h-9 min-w-[220px] border-transparent bg-transparent focus:border-primary focus:bg-background"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={value === undefined ? "" : value}
                      onChange={(e) => {
                        const v = e.target.value;
                        const num = v === "" ? undefined : Number(v);
                        const patch =
                          kind === "pretest"
                            ? { pretest: num, score: num ?? NaN }
                            : { posttest: num, score: num ?? NaN };
                        onUpdate(s.id, patch);
                      }}
                      className="h-9 w-20 font-mono border-transparent bg-transparent focus:border-primary focus:bg-background"
                      placeholder="0–100"
                    />
                  </td>
                  <td className="px-3 py-2">
                    {!numeric ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        —
                      </span>
                    ) : passed ? (
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
                      className="rounded-md p-2 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                      aria-label="Hapus baris"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-5 py-10 text-center text-sm text-muted-foreground"
                >
                  Belum ada nilai {kind === "pretest" ? "pre-test" : "post-test"}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
