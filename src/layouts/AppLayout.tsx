import { Outlet } from "react-router-dom";
import { Header } from "@/components/Header";
import { AIAssistant } from "@/components/AIAssistant";
import { useStudentsCtx } from "@/context/StudentsContext";

/**
 * AppLayout — shared chrome (header + floating AI assistant) around all
 * routed pages. The students state lives in StudentsProvider above this.
 */
export default function AppLayout() {
  const { students } = useStudentsCtx();
  return (
    <main className="relative min-h-screen pb-32">
      <Header />
      <Outlet />
      <AIAssistant students={students} />
    </main>
  );
}
