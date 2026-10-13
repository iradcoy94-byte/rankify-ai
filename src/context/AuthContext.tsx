import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session as SupabaseSession } from "@supabase/supabase-js";
import { assertSupabaseConfigured, supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "guru" | "siswa";

export interface UserProfile {
  id: string;
  schoolId: string;
  role: Role;
  email: string;
  name: string;
  nisn?: string;
  mustChangePassword: boolean;
}

interface AuthCtx {
  session: UserProfile | null;
  user: UserProfile | null;
  loading: boolean;
  isReadOnly: boolean;
  canManageData: boolean;
  mustChangePassword: boolean;
  login: (role: Role, email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

async function loadProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, school_id, role, email, full_name, nisn, must_change_password, is_active")
    .eq("id", userId)
    .single();
  if (error || !data) {
    throw new Error("Profil akun belum tersedia. Minta administrator memeriksa provisioning akun Supabase.");
  }
  if (!data.is_active) throw new Error("Akun ini dinonaktifkan. Hubungi administrator sekolah.");
  return {
    id: data.id,
    schoolId: data.school_id,
    role: data.role as Role,
    email: data.email,
    name: data.full_name,
    nisn: data.nisn ?? undefined,
    mustChangePassword: Boolean(data.must_change_password),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const acceptAuthSession = useCallback(async (authSession: SupabaseSession | null) => {
    if (!authSession) {
      setSession(null);
      return;
    }
    const profile = await loadProfile(authSession.user.id);
    setSession(profile);
  }, []);

  useEffect(() => {
    let active = true;
    try {
      assertSupabaseConfigured();
    } catch {
      setLoading(false);
      return () => { active = false; };
    }
    void supabase.auth.getSession().then(async ({ data, error }) => {
      if (!active) return;
      if (error) {
        setSession(null);
      } else {
        try {
          await acceptAuthSession(data.session);
        } catch {
          await supabase.auth.signOut();
          setSession(null);
        }
      }
      if (active) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, authSession) => {
      queueMicrotask(() => {
        void acceptAuthSession(authSession).catch(() => setSession(null));
      });
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [acceptAuthSession]);

  const login = useCallback<AuthCtx["login"]>(async (role, email, password) => {
    try {
      assertSupabaseConfigured();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error || !data.user) return { ok: false, error: error?.message ?? "Login gagal." };
      const profile = await loadProfile(data.user.id);
      if (profile.role !== role) {
        await supabase.auth.signOut();
        return { ok: false, error: `Akun ini terdaftar sebagai ${profile.role}, bukan ${role}.` };
      }
      setSession(profile);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Tidak dapat masuk." };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  const changePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", session?.id ?? "");
    if (profileError) throw profileError;
    if (session) setSession({ ...session, mustChangePassword: false });
  }, [session]);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) setSession(await loadProfile(data.user.id));
  }, []);

  const value = useMemo<AuthCtx>(() => ({
    session,
    user: session,
    loading,
    isReadOnly: session?.role === "siswa",
    canManageData: session?.role === "guru" || session?.role === "admin",
    mustChangePassword: session?.mustChangePassword ?? false,
    login,
    logout,
    changePassword,
    refreshProfile,
  }), [session, loading, login, logout, changePassword, refreshProfile]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
