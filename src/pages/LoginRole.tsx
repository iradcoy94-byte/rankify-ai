import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, GraduationCap, Lock, LogIn, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth, type Role } from "@/context/AuthContext";

interface Props {
  role: Role;
}

export default function LoginRole({ role }: Props) {
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to="/" replace />;

  const isGuru = role === "guru" || role === "admin";
  const Icon = role === "siswa" ? UserRound : GraduationCap;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const result = await login(role, email, password);
    if (result.ok === false) {
      setBusy(false);
      toast.error(result.error);
      return;
    }
    toast.success(`Selamat datang, ${isGuru ? "Guru" : "Peserta Didik"}!`);
    navigate("/", { replace: true });
  };

  const accent = isGuru
    ? "from-primary/30 via-primary/10 to-transparent"
    : "from-accent/30 via-accent/10 to-transparent";

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${accent}`} />
      <div className="container relative flex min-h-screen flex-col items-center justify-center py-16">
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md rounded-2xl border border-border bg-card/80 p-7 shadow-elegant backdrop-blur"
        >
          <Link
            to="/login"
            className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-smooth hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Pilih peran lain
          </Link>

          <div className="mb-6 flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary shadow-elegant">
              <Icon className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">
                Masuk sebagai {role === "admin" ? "Administrator" : isGuru ? "Guru" : "Peserta Didik"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isGuru
                  ? "Masuk ke ruang kerja sesuai peran dan kelas yang ditugaskan."
                  : "Akses terbatas read-only untuk melihat ranking & analisis."}
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-smooth focus:border-primary"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Kata sandi
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Kata sandi"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-smooth focus:border-primary"
              />
            </div>

            <Button
              type="submit"
              variant="hero"
              className="w-full"
              disabled={busy}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Masuk
            </Button>
          </form>

          <div className="mt-5 flex items-start gap-2 rounded-lg border border-dashed border-border bg-background/50 p-3 text-xs text-muted-foreground">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <p>Gunakan akun pilot yang dibuat oleh administrator Supabase. Hubungi pengelola sekolah jika akun belum tersedia.</p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
