import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

/** Route guard — sends unauthenticated users to /login. */
export default function RequireAuth() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}
