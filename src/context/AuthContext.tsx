import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, clearToken, setToken } from "@/services/api";

export type Role = "guru" | "siswa";

interface Session {
  role: Role;
  email: string;
  name: string;
}

interface AuthCtx {
  session: Session | null;
  user: Session | null;
  isReadOnly: boolean;
  canManageData: boolean;
  login: {
    (role: Role, email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }>;
    (email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }>;
  };
  logout: () => void;
}

const LEGACY_STORAGE_KEY = "rankify.auth.session.v1";
const SESSION_STORAGE_KEY = "rankify.auth.session.v2";

/** Hardcoded demo accounts. Passwords stored in plaintext because this is a
 *  client-only demo (no backend / no sensitive data). */
const CREDENTIALS: Record<Role, { email: string; password: string; name: string }> = {
  guru: { email: "guru@rankify.test", password: "rankify123", name: "Guru Rankify" },
  siswa: { email: "siswa@rankify.test", password: "rankify123", name: "Siswa Rankify" },
};

const apiRoleToAppRole = (role: string): Role =>
  role === "peserta_didik" ? "siswa" : "guru";

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      if (session) sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      else sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
  }, [session]);

  const login = useCallback<AuthCtx["login"]>(async (roleOrEmail: string, emailOrPassword: string, passwordArg?: string): Promise<{ ok: true } | { ok: false; error: string }> => {
    const role =
      passwordArg === undefined
        ? roleOrEmail.trim().toLowerCase() === CREDENTIALS.siswa.email
          ? "siswa"
          : "guru"
        : roleOrEmail as Role;
    const email = passwordArg === undefined ? roleOrEmail : emailOrPassword;
    const password = passwordArg === undefined ? emailOrPassword : passwordArg;

    const c = CREDENTIALS[role];
    if (!c) return { ok: false, error: "Peran tidak dikenal." };
    if (email.trim().toLowerCase() !== c.email || password !== c.password) {
      return { ok: false, error: "Email atau kata sandi salah." };
    }

    try {
      const result = await api.login(c.email, password);
      setToken(result.token);
      setSession({
        role: apiRoleToAppRole(result.user.role),
        email: result.user.email,
        name: result.user.name,
      });
      return { ok: true };
    } catch {
      clearToken();
      setSession({ role, email: c.email, name: c.name });
    }

    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    void api.logout().catch(() => {
      // Local logout should still work even when the backend is offline.
    });
    clearToken();
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
    setSession(null);
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      user: session,
      isReadOnly: session?.role === "siswa",
      canManageData: session?.role === "guru",
      login,
      logout,
    }),
    [session, login, logout]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}

export const DEMO_CREDENTIALS = CREDENTIALS;
