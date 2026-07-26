import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
    (role: Role, email: string, password: string): { ok: true } | { ok: false; error: string };
    (email: string, password: string): { ok: true } | { ok: false; error: string };
  };
  logout: () => void;
}

const STORAGE_KEY = "rankify.auth.session.v1";

/** Hardcoded demo accounts. Passwords stored in plaintext because this is a
 *  client-only demo (no backend / no sensitive data). */
const CREDENTIALS: Record<Role, { email: string; password: string; name: string }> = {
  guru: { email: "guru@rankify.test", password: "rankify123", name: "Guru Rankify" },
  siswa: { email: "siswa@rankify.test", password: "rankify123", name: "Siswa Rankify" },
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  }, [session]);

  const login = useCallback<AuthCtx["login"]>((roleOrEmail, emailOrPassword, passwordArg) => {
    const role =
      passwordArg === undefined
        ? roleOrEmail.trim().toLowerCase() === CREDENTIALS.siswa.email
          ? "siswa"
          : "guru"
        : roleOrEmail;
    const email = passwordArg === undefined ? roleOrEmail : emailOrPassword;
    const password = passwordArg === undefined ? emailOrPassword : passwordArg;

    const c = CREDENTIALS[role];
    if (!c) return { ok: false, error: "Peran tidak dikenal." };
    if (email.trim().toLowerCase() !== c.email || password !== c.password) {
      return { ok: false, error: "Email atau kata sandi salah." };
    }
    setSession({ role, email: c.email, name: c.name });
    return { ok: true };
  }, []);

  const logout = useCallback(() => setSession(null), []);

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
