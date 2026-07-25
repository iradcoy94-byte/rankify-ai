import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Beranda", end: true },
  { to: "/upload", label: "Input Data" },
  { to: "/peringkat-keseluruhan", label: "Hasil Keseluruhan" },
  { to: "/peringkat-kelas", label: "Hasil per Kelas" },
  { to: "/analisis", label: "Analisis Peningkatan" },
];

export function Header() {
  const { user, canManageData, logout } = useAuth();
  const navItems = canManageData
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => item.to !== "/upload");

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
              Ranking · Insight AI · Analysis
            </p>
          </div>
        </motion.div>

        {/* Page navigation */}
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
          <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-2 text-xs text-muted-foreground backdrop-blur md:flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
            {user?.role === "guru" ? "Guru" : "Peserta Didik"}
          </div>
          <Button variant="outline" size="icon" onClick={logout} aria-label="Keluar">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
