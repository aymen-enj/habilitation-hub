import type { Role } from "@/mocks/types";

export type RouteKey = "dashboard" | "agents" | "requests" | "validation" | "audit";

export const ROUTE_ACCESS: Record<RouteKey, Role[]> = {
  dashboard: ["ADMIN", "MANAGER", "VALIDATOR", "AUDIT_VIEWER"],
  agents: ["ADMIN", "MANAGER", "VALIDATOR", "AUDIT_VIEWER"],
  requests: ["ADMIN", "MANAGER"],
  validation: ["ADMIN", "VALIDATOR"],
  audit: ["ADMIN", "VALIDATOR", "AUDIT_VIEWER"],
};

export const canAccess = (route: RouteKey, role: Role) =>
  ROUTE_ACCESS[route].includes(role);

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrateur",
  MANAGER: "Manager",
  VALIDATOR: "Validateur",
  AUDIT_VIEWER: "Auditeur",
};
