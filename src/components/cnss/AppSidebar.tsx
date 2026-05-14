import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Users, ScrollText, Settings2, Search, Layers3 } from "lucide-react";
import type { Role } from "@/mocks/types";
import { canAccess, type RouteKey } from "@/lib/access";
import { CnssLogo } from "./CnssLogo";
import { cn } from "@/lib/utils";

interface NavItem {
  key: RouteKey;
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
}

const NAV: NavItem[] = [
  { key: "dashboard", title: "Tableau de bord", url: "/", icon: LayoutDashboard },
  { key: "agents", title: "Agents", url: "/agents", icon: Users },
  { key: "profileAssignments", title: "Affectations profils", url: "/affectations-profils", icon: Layers3 },
  { key: "consultation", title: "Consultation", url: "/consultation", icon: Search },
  { key: "parameters", title: "Paramétrage", url: "/parameters", icon: Settings2 },
  { key: "audit", title: "Journal d'audit", url: "/audit", icon: ScrollText },
];

export function AppSidebar({ role }: { role: Role }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const visible = NAV.filter((n) => canAccess(n.key, role));

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="bg-white px-4 py-5">
        <div className={cn("flex items-center", collapsed && "justify-center")}>
          {collapsed ? (
            <img
              src="/CNSS-logo.png"
              alt="Logo CNSS"
              className="h-10 w-auto object-contain"
            />
          ) : (
            <CnssLogo variant="dark" />
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/60">Navigation</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm"
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
