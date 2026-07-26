import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, LockKeyhole, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("guru@rankify.test");
  const [password, setPassword] = useState("rankify123");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-border bg-gradient-card p-6 shadow-card-soft"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Masuk Rankify.AI</h1>
            <p className="text-sm text-muted-foreground">
              Akses guru penuh, peserta didik read-only.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
        </div>

        <Button className="mt-6 w-full" variant="hero" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LockKeyhole className="h-4 w-4" />
          )}
          Masuk
        </Button>

        <div className="mt-5 rounded-xl border border-border/70 bg-background/60 p-3 text-xs text-muted-foreground">
          Akun awal: <strong>guru@rankify.test</strong> atau{" "}
          <strong>pesertadidik@rankify.test</strong>. Password:{" "}
          <strong>rankify123</strong>.
        </div>
      </form>
    </main>
  );
}
