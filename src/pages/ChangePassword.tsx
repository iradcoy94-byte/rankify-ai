import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

export default function ChangePassword() {
  const { session, mustChangePassword, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
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

  const cancelChange = async () => {
    setBusy(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tidak dapat keluar dari akun.");
      setBusy(false);
    }
  };

  return <main className="grid min-h-screen place-items-center bg-background px-4"><form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card-soft">
    <div><div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><KeyRound className="h-5 w-5" /></div><h1 className="text-2xl font-bold">Buat kata sandi baru</h1><p className="mt-1 text-sm text-muted-foreground">Kata sandi sementara harus diganti sebelum memakai Rankify.AI.</p></div>
    <div className="space-y-2"><Label htmlFor="new-password">Kata sandi baru</Label><div className="relative"><Input id="new-password" className="pr-11" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-foreground" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} aria-pressed={showPassword}><span className="sr-only">{showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}</span>{showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}</button></div></div>
    <div className="space-y-2"><Label htmlFor="confirm-password">Ulangi kata sandi</Label><div className="relative"><Input id="confirm-password" className="pr-11" type={showConfirmation ? "text" : "password"} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /><button type="button" className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-foreground" onClick={() => setShowConfirmation((visible) => !visible)} aria-label={showConfirmation ? "Sembunyikan konfirmasi kata sandi" : "Tampilkan konfirmasi kata sandi"} aria-pressed={showConfirmation}><span className="sr-only">{showConfirmation ? "Sembunyikan konfirmasi kata sandi" : "Tampilkan konfirmasi kata sandi"}</span>{showConfirmation ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}</button></div></div>
    <div className="space-y-2"><Button className="w-full" variant="hero" disabled={busy}>{busy ? "Menyimpan..." : "Simpan kata sandi"}</Button><Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => void cancelChange()}>{busy ? "Memproses..." : "Batal dan kembali ke login"}</Button></div>
  </form></main>;
}
