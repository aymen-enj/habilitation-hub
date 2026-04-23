import { LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useDemo } from "@/state/DemoState";
import { ROLE_LABEL } from "@/lib/access";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function TopHeader() {
  const { session, logout } = useDemo();
  const navigate = useNavigate();

  if (!session) return null;
  const { user } = session;

  const handleLogout = () => {
    logout();
    toast.success("Vous avez été déconnecté.");
    navigate("/login", { replace: true });
  };

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur md:px-6">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      <Separator orientation="vertical" className="h-6" />
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right md:block">
          <p className="text-sm font-semibold leading-tight text-foreground">{user.name}</p>
          <p className="text-xs text-muted-foreground">
            {user.email} · <span className="font-medium text-cnss-primary">{ROLE_LABEL[user.role]}</span>
          </p>
        </div>
        <div
          aria-hidden="true"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-cnss-primary text-sm font-semibold text-primary-foreground"
        >
          {initials}
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-danger">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Déconnexion</span>
        </Button>
      </div>
    </header>
  );
}
