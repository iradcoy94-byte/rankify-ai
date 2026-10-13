import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, UserRound, ShieldCheck, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/integrations/supabase/client";

/** Landing at /login — pick which role to sign in as. */
export default function LoginChooser() {
  const { session } = useAuth();
  if (session) return <Navigate to="/" replace />;

  const cards = [
    {
      to: "/login/guru",
      icon: GraduationCap,
      title: "Masuk sebagai Guru",
      desc: "Unggah nilai, edit data, dan jalankan analisis para peserta didik.",
      gradient: "from-primary/25 via-primary/10 to-transparent",
    },
    {
      to: "/login/siswa",
      icon: UserRound,
      title: "Masuk sebagai Peserta Didik",
      desc: "Tanya jawab dengan AI Assitant, lihat peringkatmu, dan analisis peningkatanmu.",
      gradient: "from-accent/25 via-accent/10 to-transparent",
    },
    {
      to: "/login/admin",
      icon: ShieldCheck,
      title: "Masuk sebagai Administrator",
      desc: "Akses administrasi sekolah tersedia pada tahap penggunaan sekolah.",
      gradient: "from-secondary via-secondary/40 to-transparent",
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      <div className="container relative flex min-h-screen flex-col items-center justify-center py-16">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary shadow-elegant">
            <GraduationCap className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold md:text-4xl">
            Selamat datang di{" "}
            <span className="text-gradient-primary">Rankify.AI</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Pilih peran untuk melanjutkan.
          </p>
          {!isSupabaseConfigured && <p role="alert" className="mx-auto mt-4 max-w-xl rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY sebelum login.</p>}
        </motion.div>

        <div className="grid w-full max-w-4xl gap-5 md:grid-cols-3">
          {cards.map((c, i) => (
            <motion.div
              key={c.to}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i }}
            >
              <Link
                to={c.to}
                className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-smooth hover:-translate-y-1 hover:border-primary/60 hover:shadow-elegant`}
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${c.gradient} opacity-0 transition-smooth group-hover:opacity-100`}
                />
                <div className="relative">
                  <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-secondary text-primary">
                    <c.icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold">{c.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
                  <div className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Lanjutkan
                    <ArrowRight className="h-4 w-4 transition-smooth group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}
