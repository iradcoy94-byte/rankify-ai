import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import { LogOut, GraduationCap, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const TEACHER_NAV = [
  { to: "/", label: "Beranda", end: true },
  { to: "/upload", label: "Input Data" },
  { to: "/peringkat-keseluruhan", label: "Hasil Keseluruhan" },
  { to: "/peringkat-kelas", label: "Hasil per Kelas" },
  { to: "/analisis", label: "Analisis Peningkatan" },
];

const STUDENT_NAV = [
  { to: "/", label: "AI Assistant", end: true },
  { to: "/peringkat-keseluruhan", label: "Peringkat Saya" },
  { to: "/analisis", label: "Peningkatan Saya" },
];

export function Header() {
  const { session, logout } = useAuth();
  const isGuru = session?.role === "guru";
  const navItems = isGuru ? TEACHER_NAV : STUDENT_NAV;
  const RoleIcon = isGuru ? GraduationCap : UserRound;

  return (
    <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="container flex flex-wrap items-center justify-between gap-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3"
        >
          <img
            src="/logo.png"
            alt="Logo Rankify"
            className="h-10 w-10 object-contain"
          />
          <div className="leading-tight">
            <h1 className="text-xl font-bold">
              Rankify<span className="text-gradient-primary">.AI</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              {isGuru ? "Ranking - Insight AI - Analysis" : "AI Matematika - Ranking"}
            </p>
          </div>
        </motion.div>

        <nav className="order-3 flex w-full flex-wrap items-center gap-1 md:order-2 md:w-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-full px-3 py-1.5 text-xs font-medium transition-smooth md:text-sm ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-elegant"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="order-2 flex items-center gap-2 md:order-3">
          {session && (
            <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur sm:flex">
              <RoleIcon className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium capitalize text-foreground">
                {session.role}
              </span>
              {!isGuru && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">
                  AI-first
                </span>
              )}
            </div>
          )}
          <Button variant="outline" size="icon" onClick={logout} aria-label="Keluar">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
