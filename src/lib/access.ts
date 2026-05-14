import type { Role } from "@/mocks/types";

export type RouteKey = "dashboard" | "agents" | "consultation" | "audit" | "parameters" | "profileAssignments";

export const ROUTE_ACCESS: Record<RouteKey, Role[]> = {
  dashboard: ["ADMIN", "MANAGER", "VALIDATOR", "AUDIT_VIEWER"],
  agents: ["ADMIN", "MANAGER", "VALIDATOR", "AUDIT_VIEWER"],
  consultation: ["ADMIN", "MANAGER", "VALIDATOR", "AUDIT_VIEWER"],
  audit: ["ADMIN", "VALIDATOR", "AUDIT_VIEWER"],
  parameters: ["ADMIN"],
  profileAssignments: ["ADMIN", "MANAGER"],
};

export function canAccess(route: RouteKey, role: Role) {
  return ROUTE_ACCESS[route].includes(role);
}

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrateur",
  MANAGER: "Manager",
  VALIDATOR: "Validateur",
  AUDIT_VIEWER: "Auditeur",
};
