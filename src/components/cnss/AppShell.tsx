import { Navigate, Outlet, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopHeader } from "./TopHeader";
import { useDemo } from "@/state/DemoState";
import { canAccess, type RouteKey } from "@/lib/access";
import { AlertBanner } from "./AlertBanner";

const PATH_TO_ROUTE: Record<string, RouteKey> = {
  "/": "dashboard",
  "/agents": "agents",
  "/consultation": "consultation",
  "/requests": "consultation",
  "/audit": "audit",
  "/parameters": "parameters",
  "/affectations-profils": "profileAssignments",
};

export function AppShell() {
  const { session } = useDemo();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const routeKey = PATH_TO_ROUTE[location.pathname];
  const allowed = !routeKey || canAccess(routeKey, session.user.role);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar role={session.user.role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopHeader />
          <main className="flex-1">
            {allowed ? (
              <Outlet />
            ) : (
              <div className="cnss-page">
                <AlertBanner tone="warning" title="Accès refusé">
                  Votre rôle ne dispose pas des droits nécessaires pour consulter cette page.
                </AlertBanner>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
