import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

/**
 * Top brand header with logo + tagline.
 * Pure presentation — no logic.
 */
export function Header() {
  return (
    <header className="relative z-10">
      <div className="container flex items-center justify-between py-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3"
        >
          <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <h1 className="text-xl font-bold">
              Rankify<span className="text-gradient-primary">.AI</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              OCR · Validasi · Ranking · Insight AI
            </p>
          </div>
        </motion.div>

        <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-2 text-xs text-muted-foreground backdrop-blur md:flex">
          <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
          Powered by Lovable AI
        </div>
      </div>
    </header>
  );
}
