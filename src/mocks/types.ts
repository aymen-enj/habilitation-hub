export type Role = "ADMIN" | "MANAGER" | "VALIDATOR" | "AUDIT_VIEWER";

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";

export type AgentStatus = "ACTIF" | "INACTIF" | "SUSPENDU";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Delegation {
  id: string;
  name: string;
}

export interface Application {
  id: string;
  name: string;
  domain: "RH" | "Finance" | "IT";
}

export interface Profile {
  id: string;
  applicationId: string;
  name: string;
}

export interface Module {
  id: string;
  profileId: string;
  name: string;
}

export interface Habilitation {
  id: string;
  applicationId: string;
  profileId: string;
  moduleId: string;
  startDate: string;
  endDate: string;
}

export interface Agent {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  delegationId: string;
  domain: "RH" | "Finance" | "IT";
  status: AgentStatus;
  managerId?: string;
  habilitations: Habilitation[];
}

export interface AccessRequest {
  id: string;
  createdAt: string;
  requesterId: string;
  beneficiaryId: string;
  applicationId: string;
  profileId: string;
  moduleId: string;
  startDate: string;
  endDate: string;
  justification: string;
  status: RequestStatus;
  decisionComment?: string;
  decidedAt?: string;
  decidedById?: string;
}

export type AuditEventType =
  | "REQUEST_CREATED"
  | "REQUEST_APPROVED"
  | "REQUEST_REJECTED"
  | "LOGIN"
  | "LOGOUT";

export interface AuditEvent {
  id: string;
  timestamp: string;
  type: AuditEventType;
  actorId: string;
  actorName: string;
  target: string;
  details: string;
}
