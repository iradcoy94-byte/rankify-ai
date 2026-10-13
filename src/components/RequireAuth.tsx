import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

/** Route guard — sends unauthenticated users to /login. */
export default function RequireAuth() {
  const { session, loading, mustChangePassword } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Memeriksa sesi...</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (mustChangePassword && window.location.pathname !== "/ubah-sandi") return <Navigate to="/ubah-sandi" replace />;
  return <Outlet />;
}
