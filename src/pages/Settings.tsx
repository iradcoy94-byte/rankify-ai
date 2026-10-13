import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useStudentsCtx } from "@/context/StudentsContext";
import { supabase } from "@/integrations/supabase/client";
import { LEARNING_MODELS } from "@/lib/types";

type ClassRow = { id: string; name: string; learning_model: string | null; kkm: number };
type PeriodRow = { id: string; name: string; metrics: Record<string, boolean>; is_active: boolean };

export default function Settings() {
  const { user } = useAuth();
  const { refresh } = useStudentsCtx();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [period, setPeriod] = useState<PeriodRow | null>(null);
  const [className, setClassName] = useState("");
  const [model, setModel] = useState(LEARNING_MODELS[0]);
  const [periodName, setPeriodName] = useState("Penelitian");
  const [schoolKkm, setSchoolKkm] = useState(68);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: classData, error: classError }, { data: periodData, error: periodError }, { data: schoolData }] = await Promise.all([
      supabase.from("classes").select("id,name,learning_model,kkm").order("name"),
      supabase.from("research_periods").select("id,name,metrics,is_active").eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("schools").select("default_kkm").eq("id", user?.schoolId ?? "").maybeSingle(),
    ]);
    if (classError) toast.error(classError.message);
    else setClasses((classData ?? []) as ClassRow[]);
    if (periodError) toast.error(periodError.message);
    else if (periodData) {
      setPeriod(periodData as PeriodRow);
      setPeriodName(periodData.name);
    }
    if (schoolData) setSchoolKkm(Number(schoolData.default_kkm));
  }, [user?.schoolId]);

  useEffect(() => { void load(); }, [load]);

  const addClass = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !className.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("classes").insert({ school_id: user.schoolId, name: className.trim(), learning_model: model, kkm: schoolKkm });
    setBusy(false);
    if (error) return toast.error(error.message);
    setClassName("");
    toast.success("Kelas dibuat dan Anda ditugaskan sebagai guru kelas.");
    await load();
    await refresh();
  };

  const updateKkm = async (classId: string, value: string) => {
    const kkm = Number(value);
    if (!Number.isFinite(kkm) || kkm < 0 || kkm > 100) return toast.error("KKM harus berada pada rentang 0–100.");
    const { error } = await supabase.from("classes").update({ kkm }).eq("id", classId);
    if (error) toast.error(error.message);
    else {
      setClasses((rows) => rows.map((row) => row.id === classId ? { ...row, kkm } : row));
      toast.success("KKM kelas diperbarui.");
    }
  };

  const savePeriod = async () => {
    if (!user || !periodName.trim()) return;
    setBusy(true);
    if (period) {
      const { error } = await supabase.from("research_periods").update({ name: periodName.trim() }).eq("id", period.id);
      if (error) toast.error(error.message);
      else toast.success("Periode penelitian diperbarui.");
    } else {
      const { data, error } = await supabase.from("research_periods").insert({ school_id: user.schoolId, name: periodName.trim(), is_active: true }).select("id,name,metrics,is_active").single();
      if (error) toast.error(error.message);
      else {
        setPeriod(data as PeriodRow);
        toast.success("Periode penelitian dibuat.");
        await refresh();
      }
    }
    setBusy(false);
  };

  const toggleMetric = async (key: string, checked: boolean) => {
    if (!period) return;
    const metrics = { ...period.metrics, [key]: checked };
    const { error } = await supabase.from("research_periods").update({ metrics }).eq("id", period.id);
    if (error) toast.error(error.message);
    else {
      setPeriod({ ...period, metrics });
      await refresh();
    }
  };

  return <section className="container mt-8 max-w-4xl space-y-8 pb-12">
    <div><span className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-primary"><Settings2 className="h-3.5 w-3.5" />Pengaturan penelitian</span><h2 className="text-3xl font-bold">Kelas dan periode</h2><p className="mt-2 text-sm text-muted-foreground">Tahap pilot memakai satu sekolah. Akun siswa dan penugasan roster disiapkan manual di Supabase sampai panel administrator sekolah tersedia.</p></div>
    <form onSubmit={addClass} className="grid gap-4 rounded-2xl border border-border bg-card/50 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div className="space-y-2"><Label htmlFor="class-name">Nama kelas</Label><Input id="class-name" value={className} onChange={(event) => setClassName(event.target.value)} placeholder="Kelas Eksperimen 1" required /></div>
      <div className="space-y-2"><Label htmlFor="learning-model">Model pembelajaran</Label><select id="learning-model" value={model} onChange={(event) => setModel(event.target.value as typeof model)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{LEARNING_MODELS.map((item) => <option key={item}>{item}</option>)}</select></div>
      <Button type="submit" variant="hero" disabled={busy}><Plus className="h-4 w-4" />Tambah kelas</Button>
    </form>
    <div className="space-y-3"><h3 className="font-semibold">KKM per kelas</h3>{classes.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada kelas.</p> : classes.map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/40 px-4 py-3"><div><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.learning_model ?? "Model belum diatur"}</p></div><label className="flex items-center gap-2 text-xs text-muted-foreground">KKM <Input aria-label={`KKM ${row.name}`} className="w-24" type="number" min={0} max={100} defaultValue={row.kkm} onBlur={(event) => { if (Number(event.target.value) !== row.kkm) void updateKkm(row.id, event.target.value); }} /></label></div>)}</div>
    <div className="space-y-4 rounded-2xl border border-border bg-card/50 p-5"><div><h3 className="font-semibold">Periode penelitian aktif</h3><p className="text-xs text-muted-foreground">Skor pre-test, setiap pertemuan, dan post-test tersimpan dalam periode ini.</p></div><div className="flex gap-2"><Input value={periodName} onChange={(event) => setPeriodName(event.target.value)} aria-label="Nama periode" /><Button type="button" variant="outline" onClick={() => void savePeriod()} disabled={busy}>Simpan</Button></div>{period && <div className="grid gap-2 sm:grid-cols-3">{[["prepost", "Pre-test dan post-test"], ["nGain", "N-Gain"], ["modelComparison", "Perbandingan model"]].map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm"><input type="checkbox" checked={Boolean(period.metrics[key])} onChange={(event) => void toggleMetric(key, event.target.checked)} />{label}</label>)}</div>}</div>
  </section>;
}
