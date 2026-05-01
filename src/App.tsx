import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StudentsProvider } from "@/context/StudentsContext";
import AppLayout from "@/layouts/AppLayout";
import Home from "./pages/Home";
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
        <StudentsProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/peringkat-keseluruhan" element={<OverallRanking />} />
              <Route path="/peringkat-kelas" element={<ClassRanking />} />
              <Route path="/analisis" element={<Analysis />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </StudentsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
