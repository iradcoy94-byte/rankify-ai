import { FormEvent, useCallback, useEffect, useState } from "react";
import { Copy, KeyRound, Power, RefreshCw, ShieldCheck, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, type Role } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type ClassRow = { id: string; name: string };
type ProfileRow = { id: string; full_name: string; email: string; role: Role; nisn: string | null; is_active: boolean };

function newTemporaryPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, (byte) => "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#"[byte % 57]).join("");
  return `${chars}7!`;
}

export default function Administration() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("guru");
  const [nisn, setNisn] = useState("");
  const [classId, setClassId] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState(newTemporaryPassword);
  const [defaultKkm, setDefaultKkm] = useState("68");
  const [issuedCredential, setIssuedCredential] = useState<{ email: string; password: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: classData, error: classError }, { data: profileData, error: profileError }, { data: school, error: schoolError }] = await Promise.all([
      supabase.from("classes").select("id,name").order("name"),
      supabase.from("profiles").select("id,full_name,email,role,nisn,is_active").order("full_name"),
      supabase.from("schools").select("default_kkm").eq("id", user?.schoolId ?? "").single(),
    ]);
    if (classError) toast.error(classError.message); else setClasses((classData ?? []) as ClassRow[]);
    if (profileError) toast.error(profileError.message); else setProfiles((profileData ?? []) as ProfileRow[]);
    if (schoolError) toast.error(schoolError.message); else if (school) setDefaultKkm(String(school.default_kkm));
  }, [user?.schoolId]);
  useEffect(() => { void load(); }, [load]);

  const createAccount = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: { email, fullName, role, nisn: role === "siswa" ? nisn : undefined, classId: role === "admin" ? undefined : classId, temporaryPassword },
      });
      if (error) throw new Error(data?.error ?? error.message);
      setIssuedCredential({ email, password: temporaryPassword });
      toast.success(`Akun ${email} dibuat. Berikan kata sandi sementara melalui kanal sekolah yang aman.`);
      setFullName(""); setEmail(""); setNisn(""); setTemporaryPassword(newTemporaryPassword());
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat akun.");
    } finally { setBusy(false); }
  };

  const accountAction = async (profile: ProfileRow, action: "reset-password" | "deactivate" | "reactivate") => {
    if (action === "deactivate" && !window.confirm(`Nonaktifkan akun ${profile.email}?`)) return;
    const temp = action === "reset-password" ? newTemporaryPassword() : undefined;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-account-action", { body: { profileId: profile.id, action, temporaryPassword: temp } });
      if (error) throw new Error(data?.error ?? error.message);
      if (temp) setIssuedCredential({ email: profile.email, password: temp });
      toast.success(action === "reset-password" ? "Kata sandi sementara dibuat ulang." : action === "deactivate" ? "Akun dinonaktifkan." : "Akun diaktifkan kembali.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Aksi akun gagal.");
    } finally { setBusy(false); }
  };

  const saveDefaultKkm = async () => {
    const value = Number(defaultKkm);
    if (!user || !Number.isFinite(value) || value < 0 || value > 100) return toast.error("KKM harus antara 0–100.");
    const { error } = await supabase.from("schools").update({ default_kkm: value }).eq("id", user.schoolId);
    if (error) toast.error(error.message); else toast.success("KKM bawaan sekolah diperbarui.");
  };

  return <section className="container mt-8 max-w-5xl space-y-8 pb-12">
    <div><span className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs text-primary"><ShieldCheck className="h-3.5 w-3.5" />Administrasi sekolah</span><h2 className="text-3xl font-bold">Kelola akun dan kebijakan sekolah</h2><p className="mt-2 text-sm text-muted-foreground">Setiap akun baru menerima kata sandi sementara dan wajib menggantinya saat masuk pertama kali.</p></div>
    <form onSubmit={createAccount} className="grid gap-4 rounded-2xl border border-border bg-card/50 p-5 md:grid-cols-2">
      <div className="md:col-span-2"><h3 className="flex items-center gap-2 font-semibold"><UserPlus className="h-4 w-4 text-primary" />Buat akun</h3></div>
      <div className="space-y-2"><Label htmlFor="account-name">Nama lengkap</Label><Input id="account-name" value={fullName} onChange={(event) => setFullName(event.target.value)} required /></div>
      <div className="space-y-2"><Label htmlFor="account-email">Email</Label><Input id="account-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
      <div className="space-y-2"><Label htmlFor="account-role">Peran</Label><select id="account-role" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={role} onChange={(event) => setRole(event.target.value as Role)}><option value="guru">Guru</option><option value="siswa">Siswa</option><option value="admin">Administrator</option></select></div>
      {role !== "admin" && <div className="space-y-2"><Label htmlFor="account-class">Kelas</Label><select id="account-class" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={classId} onChange={(event) => setClassId(event.target.value)} required><option value="">Pilih kelas</option>{classes.map((klass) => <option key={klass.id} value={klass.id}>{klass.name}</option>)}</select></div>}
      {role === "siswa" && <div className="space-y-2"><Label htmlFor="student-nisn">NISN</Label><Input id="student-nisn" value={nisn} onChange={(event) => setNisn(event.target.value)} inputMode="numeric" required /></div>}
      <div className="space-y-2"><Label htmlFor="temporary-password">Kata sandi sementara</Label><div className="flex gap-2"><Input id="temporary-password" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} minLength={10} required /><Button type="button" variant="outline" size="icon" onClick={() => setTemporaryPassword(newTemporaryPassword())} aria-label="Buat kata sandi baru"><KeyRound className="h-4 w-4" /></Button></div></div>
      <Button type="submit" variant="hero" disabled={busy} className="md:col-span-2">{busy ? "Membuat akun..." : "Buat akun dan tugaskan kelas"}</Button>
    </form>
    {issuedCredential && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success/40 bg-success/5 p-4 text-sm"><div><p className="font-semibold">Kredensial sementara untuk {issuedCredential.email}</p><code className="mt-1 block select-all font-mono">{issuedCredential.password}</code><p className="mt-1 text-xs text-muted-foreground">Bagikan secara aman. Pengguna harus menggantinya saat login pertama.</p></div><Button variant="outline" size="sm" onClick={() => { void navigator.clipboard.writeText(issuedCredential.password); toast.success("Kata sandi disalin."); }}><Copy className="h-4 w-4" />Salin</Button></div>}
    <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
      <div className="space-y-3 rounded-2xl border border-border bg-card/50 p-5"><h3 className="font-semibold">KKM bawaan sekolah</h3><p className="text-xs text-muted-foreground">Guru dapat menetapkan nilai berbeda untuk kelasnya.</p><div className="flex gap-2"><Input type="number" min={0} max={100} value={defaultKkm} onChange={(event) => setDefaultKkm(event.target.value)} /><Button variant="outline" onClick={() => void saveDefaultKkm()}>Simpan</Button></div></div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card/50"><div className="flex items-center gap-2 border-b border-border p-4 font-semibold"><Users className="h-4 w-4 text-primary" />Akun sekolah ({profiles.length})</div><div className="max-h-96 overflow-auto">{profiles.map((profile) => <div key={profile.id} className="flex flex-wrap items-center gap-3 border-b border-border/60 px-4 py-3 text-sm"><div className="min-w-48 flex-1"><p className="font-medium">{profile.full_name || "Nama belum diisi"}</p><p className="text-xs text-muted-foreground">{profile.email}{profile.nisn ? ` · NISN ${profile.nisn}` : ""}</p></div><span className="rounded-full bg-secondary px-2.5 py-1 text-xs capitalize">{profile.role}</span><span className={`text-xs ${profile.is_active ? "text-success" : "text-destructive"}`}>{profile.is_active ? "Aktif" : "Nonaktif"}</span><div className="flex gap-1"><Button variant="outline" size="icon" disabled={busy} onClick={() => void accountAction(profile, "reset-password")} aria-label={`Reset sandi ${profile.email}`} title="Atur ulang kata sandi"><RefreshCw className="h-3.5 w-3.5" /></Button>{profile.id !== user?.id && <Button variant="outline" size="icon" disabled={busy} onClick={() => void accountAction(profile, profile.is_active ? "deactivate" : "reactivate")} aria-label={`${profile.is_active ? "Nonaktifkan" : "Aktifkan"} ${profile.email}`} title={profile.is_active ? "Nonaktifkan akun" : "Aktifkan akun"}><Power className="h-3.5 w-3.5" /></Button>}</div></div>)}</div></div>
    </div>
  </section>;
}
