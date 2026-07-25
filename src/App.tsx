import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { StudentsProvider } from "@/context/StudentsContext";
import AppLayout from "@/layouts/AppLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Upload from "./pages/Upload";
import OverallRanking from "./pages/OverallRanking";
import ClassRanking from "./pages/ClassRanking";
import Analysis from "./pages/Analysis";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <RequireAuth>
                  <StudentsProvider>
                    <AppLayout />
                  </StudentsProvider>
                </RequireAuth>
              }
            >
              <Route path="/" element={<Home />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/peringkat-keseluruhan" element={<OverallRanking />} />
              <Route path="/peringkat-kelas" element={<ClassRanking />} />
              <Route path="/analisis" element={<Analysis />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Memeriksa sesi...
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default App;
