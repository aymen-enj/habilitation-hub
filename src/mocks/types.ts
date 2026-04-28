export type Role = "ADMIN" | "MANAGER" | "VALIDATOR" | "AUDIT_VIEWER";

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";

export type BatchStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "PARTIAL";

export type RequestOperation = "ADD" | "REMOVE";

export type AgencyChangeOperation =
  | "FIRST_ASSIGNMENT"
  | "STOP_CURRENT_RIGHTS"
  | "CHANGE_STOP_RIGHTS"
  | "CHANGE_TRANSFER_RIGHTS";

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
  operation: RequestOperation; // ADD ou REMOVE
  batchId?: string; // ID du lot si fait partie d'un lot
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

export interface BatchRequest {
  id: string;
  createdAt: string;
  requesterId: string;
  operation: RequestOperation;
  fileName: string;
  status: BatchStatus;
  requests: AccessRequest[]; // Les demandes individuelles du lot
  totalApproved?: number;
  totalRejected?: number;
  decidedAt?: string;
  decidedById?: string;
}

export type AuditEventType =
  | "REQUEST_CREATED"
  | "REQUEST_APPROVED"
  | "REQUEST_REJECTED"
  | "BATCH_CREATED"
  | "BATCH_APPROVED"
  | "BATCH_REJECTED"
  | "BATCH_PARTIAL"
  | "LOGIN"
  | "LOGOUT"
  | "AGENCY_CHANGED"
  | "RIGHT_CLOSED";

export interface AuditEvent {
  id: string;
  timestamp: string;
  type: AuditEventType;
  actorId: string;
  actorName: string;
  target: string;
  details: string;
}
