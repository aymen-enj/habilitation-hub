import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DemoStateProvider } from "@/state/DemoState";
import { AppShell } from "@/components/cnss/AppShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Agents from "./pages/Agents";
import Audit from "./pages/Audit";
import Parameters from "./pages/Parameters";
import Requests from "./pages/Requests";
import ProfileAssignments from "./pages/ProfileAssignments";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <DemoStateProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={
              <ErrorBoundary>
                <Login />
              </ErrorBoundary>
            } />
            <Route element={<ErrorBoundary><AppShell /></ErrorBoundary>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/affectations-profils" element={<ProfileAssignments />} />
              <Route path="/audit" element={<Audit />} />
              <Route path="/consultation" element={<Requests />} />
              <Route path="/requests" element={<Navigate to="/consultation" replace />} />
              <Route path="/parameters" element={<Parameters />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </DemoStateProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
