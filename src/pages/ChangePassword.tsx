import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

export default function ChangePassword() {
  const { session, mustChangePassword, changePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  if (!session) return <Navigate to="/login" replace />;
  if (!mustChangePassword) return <Navigate to="/" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 10) return toast.error("Kata sandi baru minimal 10 karakter.");
    if (password !== confirmation) return toast.error("Konfirmasi kata sandi belum sama.");
    setBusy(true);
    try {
      await changePassword(password);
      toast.success("Kata sandi berhasil diperbarui.");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengganti kata sandi.");
    } finally {
      setBusy(false);
    }
  };

  return <main className="grid min-h-screen place-items-center bg-background px-4"><form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card-soft">
    <div><div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><KeyRound className="h-5 w-5" /></div><h1 className="text-2xl font-bold">Buat kata sandi baru</h1><p className="mt-1 text-sm text-muted-foreground">Kata sandi sementara harus diganti sebelum memakai Rankify.AI.</p></div>
    <div className="space-y-2"><Label htmlFor="new-password">Kata sandi baru</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
    <div className="space-y-2"><Label htmlFor="confirm-password">Ulangi kata sandi</Label><Input id="confirm-password" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></div>
    <Button className="w-full" variant="hero" disabled={busy}>{busy ? "Menyimpan..." : "Simpan kata sandi"}</Button>
  </form></main>;
}
