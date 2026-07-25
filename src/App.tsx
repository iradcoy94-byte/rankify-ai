import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
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

              <Route element={<RequireAuth />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/upload" element={<Upload />} />
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


