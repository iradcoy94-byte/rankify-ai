import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/context/AuthContext";
import { StudentsProvider } from "@/context/StudentsContext";
import RequireAuth from "@/components/RequireAuth";
import AppLayout from "@/layouts/AppLayout";
import Home from "./pages/Home";
import Upload from "./pages/Upload";
import OverallRanking from "./pages/OverallRanking";
import ClassRanking from "./pages/ClassRanking";
import Analysis from "./pages/Analysis";
import LoginChooser from "./pages/LoginChooser";
import LoginRole from "./pages/LoginRole";
import StudentAssistant from "./pages/StudentAssistant";
import Materials from "./pages/Materials";
import ChangePassword from "./pages/ChangePassword";
import Settings from "./pages/Settings";
import Administration from "./pages/Administration";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <StudentsProvider>
            <Routes>
              <Route path="/login" element={<LoginChooser />} />
              <Route path="/login/guru" element={<LoginRole role="guru" />} />
              <Route path="/login/siswa" element={<LoginRole role="siswa" />} />
              <Route path="/login/admin" element={<LoginRole role="admin" />} />

              <Route element={<RequireAuth />}>
                <Route path="/ubah-sandi" element={<ChangePassword />} />
                <Route element={<AppLayout />}>
                  <Route path="/" element={<RoleHome />} />
                  <Route path="/upload" element={<TeacherOnly><Upload /></TeacherOnly>} />
                  <Route path="/materi" element={<TeacherOnly><Materials /></TeacherOnly>} />
                  <Route path="/pengaturan" element={<TeacherOnly><Settings /></TeacherOnly>} />
                  <Route path="/administrasi" element={<AdminOnly><Administration /></AdminOnly>} />
                  <Route path="/peringkat-keseluruhan" element={<OverallRanking />} />
                  <Route path="/peringkat-kelas" element={<ClassRanking />} />
                  <Route path="/analisis" element={<Analysis />} />
                </Route>
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </StudentsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

function RoleHome() {
  const { session } = useAuth();
  return session?.role === "siswa" ? <StudentAssistant /> : <Home />;
}

function TeacherOnly({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (session?.role !== "guru" && session?.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (session?.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}
