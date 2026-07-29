import { Outlet } from "react-router-dom";
import { Header } from "@/components/Header";
import { AIAssistant } from "@/components/AIAssistant";
import { useStudentsCtx } from "@/context/StudentsContext";
import { useAuth } from "@/context/AuthContext";

/**
 * AppLayout — shared chrome (header + floating AI assistant) around all
 * routed pages. The students state lives in StudentsProvider above this.
 */
export default function AppLayout() {
  const { students } = useStudentsCtx();
  const { session } = useAuth();
  const showFloatingAssistant = session?.role === "guru";

  return (
    <main className={`relative min-h-screen ${showFloatingAssistant ? "pb-32" : ""}`}>
      <Header />
      <Outlet />
      {showFloatingAssistant && <AIAssistant students={students} />}
    </main>
  );
}
