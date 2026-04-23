import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  accessRequests as seedRequests,
  agents as seedAgents,
  applications,
  auditEvents as seedEvents,
  delegations,
  modules,
  profiles,
  users,
} from "@/mocks/data";
import type {
  AccessRequest,
  AuditEvent,
  AuditEventType,
  RequestStatus,
  Role,
  User,
} from "@/mocks/types";

interface Session {
  user: User;
}

interface CreateRequestInput {
  beneficiaryId: string;
  applicationId: string;
  profileId: string;
  moduleId: string;
  startDate: string;
  endDate: string;
  justification: string;
}

interface DemoState {
  session: Session | null;
  login: (email: string, role: Role) => void;
  logout: () => void;
  agents: typeof seedAgents;
  applications: typeof applications;
  profiles: typeof profiles;
  modules: typeof modules;
  delegations: typeof delegations;
  users: typeof users;
  requests: AccessRequest[];
  events: AuditEvent[];
  createRequest: (input: CreateRequestInput) => void;
  decideRequest: (id: string, decision: "APPROVED" | "REJECTED", comment: string) => void;
}

const DemoContext = createContext<DemoState | null>(null);

const findUserByRole = (role: Role): User =>
  users.find((u) => u.role === role) ?? users[0];

const beneficiaryName = (id: string) => {
  const a = seedAgents.find((x) => x.id === id);
  return a ? `${a.firstName} ${a.lastName}` : id;
};

const appName = (id: string) =>
  applications.find((a) => a.id === id)?.name ?? id;

export function DemoStateProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [requests, setRequests] = useState<AccessRequest[]>(seedRequests);
  const [events, setEvents] = useState<AuditEvent[]>(seedEvents);

  const pushEvent = useCallback(
    (type: AuditEventType, target: string, details: string, actor?: User) => {
      const who = actor ?? session?.user;
      if (!who) return;
      const ev: AuditEvent = {
        id: `ev-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type,
        actorId: who.id,
        actorName: who.name,
        target,
        details,
      };
      setEvents((prev) => [ev, ...prev]);
    },
    [session],
  );

  const login = useCallback((email: string, role: Role) => {
    const base = findUserByRole(role);
    const user: User = { ...base, email: email || base.email };
    setSession({ user });
    const ev: AuditEvent = {
      id: `ev-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: "LOGIN",
      actorId: user.id,
      actorName: user.name,
      target: "session",
      details: `Connexion (${role}).`,
    };
    setEvents((prev) => [ev, ...prev]);
  }, []);

  const logout = useCallback(() => {
    if (session?.user) {
      const ev: AuditEvent = {
        id: `ev-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: "LOGOUT",
        actorId: session.user.id,
        actorName: session.user.name,
        target: "session",
        details: "Déconnexion.",
      };
      setEvents((prev) => [ev, ...prev]);
    }
    setSession(null);
  }, [session]);

  const createRequest = useCallback(
    (input: CreateRequestInput) => {
      if (!session?.user) return;
      const req: AccessRequest = {
        id: `req-${Date.now()}`,
        createdAt: new Date().toISOString(),
        requesterId: session.user.id,
        status: "PENDING" as RequestStatus,
        ...input,
      };
      setRequests((prev) => [req, ...prev]);
      pushEvent(
        "REQUEST_CREATED",
        req.id,
        `Demande créée pour ${beneficiaryName(req.beneficiaryId)} — ${appName(req.applicationId)}.`,
      );
    },
    [session, pushEvent],
  );

  const decideRequest = useCallback(
    (id: string, decision: "APPROVED" | "REJECTED", comment: string) => {
      if (!session?.user) return;
      let target: AccessRequest | undefined;
      setRequests((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          target = r;
          return {
            ...r,
            status: decision,
            decisionComment: comment,
            decidedAt: new Date().toISOString(),
            decidedById: session.user.id,
          };
        }),
      );
      if (target) {
        pushEvent(
          decision === "APPROVED" ? "REQUEST_APPROVED" : "REQUEST_REJECTED",
          id,
          `Demande ${decision === "APPROVED" ? "approuvée" : "rejetée"} — ${beneficiaryName(target.beneficiaryId)} (${appName(target.applicationId)}).`,
        );
      }
    },
    [session, pushEvent],
  );

  const value = useMemo<DemoState>(
    () => ({
      session,
      login,
      logout,
      agents: seedAgents,
      applications,
      profiles,
      modules,
      delegations,
      users,
      requests,
      events,
      createRequest,
      decideRequest,
    }),
    [session, login, logout, requests, events, createRequest, decideRequest],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within DemoStateProvider");
  return ctx;
}
