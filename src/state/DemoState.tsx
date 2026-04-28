import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
  AgencyChangeOperation,
  Agent,
  AuditEvent,
  AuditEventType,
  BatchRequest,
  BatchStatus,
  RequestOperation,
  RequestStatus,
  Role,
  User,
} from "@/mocks/types";

interface Session {
  user: User;
}

interface CreateRequestInput {
  operation: RequestOperation;
  beneficiaryId: string;
  applicationId: string;
  profileId: string;
  moduleId: string;
  startDate: string;
  endDate: string;
  justification: string;
}

interface CreateBatchInput {
  operation: RequestOperation;
  fileName: string;
  requests: CreateRequestInput[];
}

interface DemoState {
  session: Session | null;
  login: (email: string, role: Role) => void;
  logout: () => void;
  agents: Agent[];
  applications: typeof applications;
  profiles: typeof profiles;
  modules: typeof modules;
  delegations: typeof delegations;
  users: typeof users;
  requests: AccessRequest[];
  batches: BatchRequest[];
  events: AuditEvent[];
  createRequest: (input: CreateRequestInput) => void;
  createBatch: (input: CreateBatchInput) => string;
  decideRequest: (
    id: string,
    decision: "APPROVED" | "REJECTED",
    comment: string,
  ) => void;
  decideBatchRequests: (
    batchId: string,
    decisions: Array<{ requestId: string; decision: "APPROVED" | "REJECTED" }>,
    comment: string,
  ) => void;
  changeAgentAgency: (
    agentId: string,
    targetDelegationId: string,
    operation: AgencyChangeOperation,
  ) => void;
  closeAgentRight: (agentId: string, habilitationId: string) => void;
  closeBatchRights: (items: Array<{ agentId: string; habilitationId: string }>) => number;
}

const DemoContext = createContext<DemoState | null>(null);
const SESSION_STORAGE_KEY = "habilitation-hub.demo-session";

const readStoredSession = (): Session | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    return parsed?.user?.id ? parsed : null;
  } catch {
    return null;
  }
};

const findUserByRole = (role: Role): User =>
  users.find((u) => u.role === role) ?? users[0];

const beneficiaryName = (id: string) => {
  const a = seedAgents.find((x) => x.id === id);
  return a ? `${a.firstName} ${a.lastName}` : id;
};

const appName = (id: string) =>
  applications.find((a) => a.id === id)?.name ?? id;

export function DemoStateProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() =>
    readStoredSession(),
  );
  const [agents, setAgents] = useState<Agent[]>(() =>
    seedAgents.map((a) => ({
      ...a,
      habilitations: a.habilitations.map((h) => ({ ...h })),
    })),
  );
  const [requests, setRequests] = useState<AccessRequest[]>(seedRequests);
  const [batches, setBatches] = useState<BatchRequest[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>(seedEvents);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      if (session) {
        window.localStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify(session),
        );
      } else {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors in demo mode.
    }
  }, [session]);

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
      const opLabel = input.operation === "ADD" ? "Ajout" : "Retrait";
      pushEvent(
        "REQUEST_CREATED",
        req.id,
        `Demande d'${opLabel} créée pour ${beneficiaryName(req.beneficiaryId)} — ${appName(req.applicationId)}.`,
      );
    },
    [session, pushEvent],
  );

  const createBatch = useCallback(
    (input: CreateBatchInput): string => {
      if (!session?.user || input.requests.length === 0) return "";
      const now = new Date().toISOString();
      const batchId = `batch-${Date.now()}`;
      
      const newRequests: AccessRequest[] = input.requests.map((req, i) => ({
        id: `req-${batchId}-${i}`,
        createdAt: now,
        requesterId: session.user.id,
        batchId,
        status: "PENDING" as RequestStatus,
        ...req,
      }));
      
      const batch: BatchRequest = {
        id: batchId,
        createdAt: now,
        requesterId: session.user.id,
        operation: input.operation,
        fileName: input.fileName,
        status: "PENDING",
        requests: newRequests,
      };
      
      setBatches((prev) => [batch, ...prev]);
      setRequests((prev) => [...newRequests, ...prev]);
      
      const opLabel = input.operation === "ADD" ? "d'ajout" : "de retrait";
      pushEvent(
        "BATCH_CREATED",
        batchId,
        `Lot ${opLabel} "${input.fileName}" créé (${newRequests.length} demande(s)).`,
      );
      
      return batchId;
    },
    [session, pushEvent],
  );

  const decideRequest = useCallback(
    (id: string, decision: "APPROVED" | "REJECTED", comment: string) => {
      if (!session?.user) return;

      const target = requests.find((r) => r.id === id);
      if (!target || target.status !== "PENDING") return;

      const decidedAt = new Date().toISOString();

      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: decision,
                decisionComment: comment,
                decidedAt,
                decidedById: session.user.id,
              }
            : r,
        ),
      );

      if (decision === "APPROVED") {
        if (target.operation === "ADD") {
          // Ajout : créer une nouvelle habilitation
          setAgents((prev) =>
            prev.map((a) => {
              if (a.id !== target.beneficiaryId) return a;

              const alreadyOpen = a.habilitations.some(
                (h) =>
                  h.applicationId === target.applicationId &&
                  h.profileId === target.profileId &&
                  h.moduleId === target.moduleId &&
                  new Date(h.endDate) > new Date(decidedAt),
              );
              if (alreadyOpen) return a;

              return {
                ...a,
                status: "ACTIF",
                habilitations: [
                  {
                    id: `h-${Date.now()}`,
                    applicationId: target.applicationId,
                    profileId: target.profileId,
                    moduleId: target.moduleId,
                    startDate: target.startDate,
                    endDate: target.endDate,
                  },
                  ...a.habilitations,
                ],
              };
            }),
          );
        } else {
          // Retrait : fermer l'habilitation correspondante
          setAgents((prev) =>
            prev.map((a) => {
              if (a.id !== target.beneficiaryId) return a;

              const nextHabilitations = a.habilitations.map((h) => {
                if (
                  h.applicationId === target.applicationId &&
                  h.profileId === target.profileId &&
                  h.moduleId === target.moduleId &&
                  new Date(h.endDate) > new Date(decidedAt)
                ) {
                  return { ...h, endDate: decidedAt };
                }
                return h;
              });

              return {
                ...a,
                status: nextHabilitations.some(
                  (h) => new Date(h.endDate) > new Date(decidedAt),
                )
                  ? "ACTIF"
                  : "INACTIF",
                habilitations: nextHabilitations,
              };
            }),
          );
        }
      }

      const opLabel = target.operation === "ADD" ? "d'ajout" : "de retrait";
      pushEvent(
        decision === "APPROVED" ? "REQUEST_APPROVED" : "REQUEST_REJECTED",
        id,
        `Demande ${opLabel} ${decision === "APPROVED" ? "approuvée" : "rejetée"} — ${beneficiaryName(target.beneficiaryId)} (${appName(target.applicationId)}).`,
      );
    },
    [session, requests, pushEvent],
  );

  const decideBatchRequests = useCallback(
    (
      batchId: string,
      decisions: Array<{ requestId: string; decision: "APPROVED" | "REJECTED" }>,
      comment: string,
    ) => {
      if (!session?.user) return;

      const batch = batches.find((b) => b.id === batchId);
      if (!batch || batch.status !== "PENDING") return;

      const decidedAt = new Date().toISOString();
      let approved = 0;
      let rejected = 0;

      // Update each request
      decisions.forEach(({ requestId, decision }) => {
        const target = batch.requests.find((r) => r.id === requestId);
        if (!target) return;

        if (decision === "APPROVED") {
          approved++;
          if (target.operation === "ADD") {
            setAgents((prev) =>
              prev.map((a) => {
                if (a.id !== target.beneficiaryId) return a;
                const alreadyOpen = a.habilitations.some(
                  (h) =>
                    h.applicationId === target.applicationId &&
                    h.profileId === target.profileId &&
                    h.moduleId === target.moduleId &&
                    new Date(h.endDate) > new Date(decidedAt),
                );
                if (alreadyOpen) return a;
                return {
                  ...a,
                  status: "ACTIF",
                  habilitations: [
                    {
                      id: `h-${Date.now()}-${requestId}`,
                      applicationId: target.applicationId,
                      profileId: target.profileId,
                      moduleId: target.moduleId,
                      startDate: target.startDate,
                      endDate: target.endDate,
                    },
                    ...a.habilitations,
                  ],
                };
              }),
            );
          } else {
            setAgents((prev) =>
              prev.map((a) => {
                if (a.id !== target.beneficiaryId) return a;
                const nextHabilitations = a.habilitations.map((h) => {
                  if (
                    h.applicationId === target.applicationId &&
                    h.profileId === target.profileId &&
                    h.moduleId === target.moduleId &&
                    new Date(h.endDate) > new Date(decidedAt)
                  ) {
                    return { ...h, endDate: decidedAt };
                  }
                  return h;
                });
                return {
                  ...a,
                  status: nextHabilitations.some(
                    (h) => new Date(h.endDate) > new Date(decidedAt),
                  )
                    ? "ACTIF"
                    : "INACTIF",
                  habilitations: nextHabilitations,
                };
              }),
            );
          }
        } else {
          rejected++;
        }
      });

      // Update requests state
      setRequests((prev) =>
        prev.map((r) => {
          const d = decisions.find((dec) => dec.requestId === r.id);
          if (d) {
            return {
              ...r,
              status: d.decision,
              decisionComment: comment,
              decidedAt,
              decidedById: session.user!.id,
            };
          }
          return r;
        }),
      );

      // Update batch status
      const newStatus: BatchStatus =
        rejected === 0
          ? "COMPLETED"
          : approved === 0
            ? "COMPLETED"
            : "PARTIAL";

      setBatches((prev) =>
        prev.map((b) =>
          b.id === batchId
            ? {
                ...b,
                status: newStatus,
                totalApproved: approved,
                totalRejected: rejected,
                decidedAt,
                decidedById: session.user!.id,
              }
            : b,
        ),
      );

      const opLabel = batch.operation === "ADD" ? "d'ajout" : "de retrait";
      const eventType = rejected === 0 ? "BATCH_APPROVED" : approved === 0 ? "BATCH_REJECTED" : "BATCH_PARTIAL";
      pushEvent(
        eventType,
        batchId,
        `Lot ${opLabel} "${batch.fileName}" traité : ${approved} approuvée(s), ${rejected} rejetée(s).`,
      );
    },
    [session, batches, pushEvent],
  );

  const changeAgentAgency = useCallback(
    (
      agentId: string,
      targetDelegationId: string,
      operation: AgencyChangeOperation,
    ) => {
      if (!session?.user) return;

      const operationLabel: Record<AgencyChangeOperation, string> = {
        FIRST_ASSIGNMENT: "Première affectation à une agence",
        STOP_CURRENT_RIGHTS: "Arrêt total des droits dans l'agence actuelle",
        CHANGE_STOP_RIGHTS: "Changement d'agence avec arrêt total des droits",
        CHANGE_TRANSFER_RIGHTS: "Changement d'agence avec transfert des droits",
      };

      const nowIso = new Date().toISOString();
      const targetAgent = agents.find((agent) => agent.id === agentId);
      if (!targetAgent) return;

      const closeRights =
        operation === "STOP_CURRENT_RIGHTS" ||
        operation === "CHANGE_STOP_RIGHTS";
      const changeDelegation = operation !== "STOP_CURRENT_RIGHTS";

      const fromDelegation =
        delegations.find((d) => d.id === targetAgent.delegationId)?.name ??
        targetAgent.delegationId;
      const toDelegation =
        delegations.find((d) => d.id === targetDelegationId)?.name ??
        targetDelegationId;
      const summary = `${operationLabel[operation]} — ${fromDelegation} -> ${toDelegation}`;

      setAgents((prev) =>
        prev.map((agent) => {
          if (agent.id !== agentId) return agent;

          const nextHabilitations = closeRights
            ? agent.habilitations.map((h) => {
                if (new Date(h.endDate) <= new Date(nowIso)) return h;
                return { ...h, endDate: nowIso };
              })
            : agent.habilitations;

          const nextAgent: Agent = {
            ...agent,
            delegationId: changeDelegation
              ? targetDelegationId
              : agent.delegationId,
            status: closeRights ? "INACTIF" : "ACTIF",
            habilitations: nextHabilitations,
          };

          return nextAgent;
        }),
      );

      pushEvent("AGENCY_CHANGED", `agent:${agentId}`, summary);
    },
    [session, agents, pushEvent],
  );

  const closeAgentRight = useCallback(
    (agentId: string, habilitationId: string) => {
      if (!session?.user) return;

      const nowIso = new Date().toISOString();
      const targetAgent = agents.find((agent) => agent.id === agentId);
      const targetRight = targetAgent?.habilitations.find(
        (h) => h.id === habilitationId,
      );
      if (!targetRight || new Date(targetRight.endDate) <= new Date(nowIso))
        return;

      const app =
        applications.find((a) => a.id === targetRight.applicationId)?.name ??
        targetRight.applicationId;
      const profile =
        profiles.find((p) => p.id === targetRight.profileId)?.name ??
        targetRight.profileId;
      const module =
        modules.find((m) => m.id === targetRight.moduleId)?.name ??
        targetRight.moduleId;
      const summary = `Droit fermé — ${app} / ${profile} / ${module}`;

      setAgents((prev) =>
        prev.map((agent) => {
          if (agent.id !== agentId) return agent;

          const nextHabilitations = agent.habilitations.map((h) => {
            if (h.id !== habilitationId) return h;
            return { ...h, endDate: nowIso };
          });

          return {
            ...agent,
            status: nextHabilitations.some(
              (h) => new Date(h.endDate) > new Date(nowIso),
            )
              ? "ACTIF"
              : "INACTIF",
            habilitations: nextHabilitations,
          };
        }),
      );

      pushEvent("RIGHT_CLOSED", `agent:${agentId}`, summary);
    },
    [session, agents, pushEvent],
  );

  const closeBatchRights = useCallback(
    (items: Array<{ agentId: string; habilitationId: string }>): number => {
      if (!session?.user || items.length === 0) return 0;
      const nowIso = new Date().toISOString();
      let closed = 0;
      setAgents((prev) =>
        prev.map((agent) => {
          const agentItems = items.filter((i) => i.agentId === agent.id);
          if (agentItems.length === 0) return agent;
          const closedIds = new Set(agentItems.map((i) => i.habilitationId));
          const nextHabilitations = agent.habilitations.map((h) => {
            if (!closedIds.has(h.id)) return h;
            if (new Date(h.endDate) <= new Date(nowIso)) return h;
            closed++;
            return { ...h, endDate: nowIso };
          });
          return {
            ...agent,
            status: nextHabilitations.some((h) => new Date(h.endDate) > new Date(nowIso))
              ? "ACTIF"
              : "INACTIF",
            habilitations: nextHabilitations,
          };
        }),
      );
      pushEvent(
        "RIGHT_CLOSED",
        `batch:${items.length}`,
        `Lot de ${items.length} droit(s) fermé(s) en masse.`,
      );
      return items.length;
    },
    [session, pushEvent],
  );

  const value = useMemo<DemoState>(
    () => ({
      session,
      login,
      logout,
      agents,
      applications,
      profiles,
      modules,
      delegations,
      users,
      requests,
      batches,
      events,
      createRequest,
      createBatch,
      decideRequest,
      decideBatchRequests,
      changeAgentAgency,
      closeAgentRight,
      closeBatchRights,
    }),
    [
      session,
      login,
      logout,
      agents,
      requests,
      batches,
      events,
      createRequest,
      createBatch,
      decideRequest,
      decideBatchRequests,
      changeAgentAgency,
      closeAgentRight,
      closeBatchRights,
    ],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within DemoStateProvider");
  return ctx;
}
