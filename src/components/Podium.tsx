import { motion } from "framer-motion";
import { Crown, Medal, Award } from "lucide-react";
import type { Student } from "@/lib/types";

interface PodiumProps {
  students: Student[];
}

/**
 * Top-3 podium with gold/silver/bronze styling.
 * Renders nothing if there are no valid students yet.
 */
export function Podium({ students }: PodiumProps) {
  // Pick the first row of each rank 1..3
  const valid = students.filter((s) => s.isValid && s.rank > 0);
  const r1 = valid.find((s) => s.rank === 1);
  const r2 = valid.find((s) => s.rank === 2);
  const r3 = valid.find((s) => s.rank === 3);

  if (!r1 && !r2 && !r3) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {r2 && <PodiumCard student={r2} variant="silver" delay={0.1} />}
      {r1 && <PodiumCard student={r1} variant="gold" delay={0} featured />}
      {r3 && <PodiumCard student={r3} variant="bronze" delay={0.2} />}
    </div>
  );
}

interface CardProps {
  student: Student;
  variant: "gold" | "silver" | "bronze";
  delay: number;
  featured?: boolean;
}

function PodiumCard({ student, variant, delay, featured }: CardProps) {
  const config = {
    gold: {
      gradient: "bg-gradient-gold",
      shadow: "shadow-gold animate-glow-gold",
      icon: Crown,
      label: "Juara 1",
      ring: "ring-gold",
    },
    silver: {
      gradient: "bg-gradient-silver",
      shadow: "shadow-silver",
      icon: Medal,
      label: "Juara 2",
      ring: "ring-silver",
    },
    bronze: {
      gradient: "bg-gradient-bronze",
      shadow: "shadow-bronze",
      icon: Award,
      label: "Juara 3",
      ring: "ring-bronze",
    },
  }[variant];

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] }}
      className={`relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-card p-6 ${
        config.shadow
      } ${featured ? "md:-translate-y-3" : ""}`}
    >
      {/* Decorative shimmer */}
      <div
        className={`absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl ${config.gradient}`}
      />

      <div className="relative flex items-start justify-between">
        <div className={`grid h-12 w-12 place-items-center rounded-xl ${config.gradient} shadow-elegant`}>
          <Icon className="h-6 w-6 text-background" strokeWidth={2.5} />
        </div>
        <span className="rounded-full bg-background/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
          {config.label}
        </span>
      </div>

      <div className="relative mt-6">
        <p className="text-sm text-muted-foreground">Siswa</p>
        <p className="truncate text-2xl font-bold">{student.name}</p>
      </div>

      <div className="relative mt-4 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Nilai
          </p>
          <p className="font-mono text-4xl font-bold text-foreground">
            {student.score}
          </p>
        </div>
        <div
          className={`grid h-14 w-14 place-items-center rounded-2xl text-3xl font-black text-background ${config.gradient}`}
        >
          {student.rank}
        </div>
      </div>
    </motion.div>
  );
}
