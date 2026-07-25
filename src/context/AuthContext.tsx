import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, AuthUser, clearToken, getToken, setToken } from "@/services/api";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  canManageData: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .me()
      .then(({ user }) => {
        if (active) setUser(user);
      })
      .catch(() => {
        clearToken();
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      canManageData: user?.role === "guru",
      async login(email, password) {
        const result = await api.login(email, password);
        setToken(result.token);
        setUser(result.user);
        toast.success(`Masuk sebagai ${result.user.role === "guru" ? "guru" : "peserta didik"}`);
      },
      async logout() {
        try {
          await api.logout();
        } catch {
          // Local logout still wins when the server session is already gone.
        }
        clearToken();
        setUser(null);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
