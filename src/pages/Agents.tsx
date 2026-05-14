import { useEffect, useMemo, useState } from "react";
import { UserCircle2, History } from "lucide-react";
import { useDemo } from "@/state/DemoState";
import { PageHeader } from "@/components/cnss/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/cnss/EmptyState";
import { AlertBanner } from "@/components/cnss/AlertBanner";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { AgencyChangeOperation, AgentStatus } from "@/mocks/types";

const STATUS_STYLES: Record<AgentStatus, string> = {
  ACTIF: "bg-success-soft text-success border-success/20",
  INACTIF: "bg-muted text-muted-foreground border-border",
  SUSPENDU: "bg-warning-soft text-warning border-warning/20",
};

const STATUS_LABEL: Record<AgentStatus, string> = {
  ACTIF: "Actif",
  INACTIF: "Inactif",
  SUSPENDU: "Suspendu",
};

const AGENCY_OPERATIONS: Array<{ value: AgencyChangeOperation; label: string }> = [
  { value: "FIRST_ASSIGNMENT", label: "Premiere affectation a une agence" },
  { value: "STOP_CURRENT_RIGHTS", label: "Arret total des droits dans l'agence actuelle" },
  { value: "CHANGE_STOP_RIGHTS", label: "Changement d'agence avec arret total des droits" },
  { value: "CHANGE_TRANSFER_RIGHTS", label: "Changement d'agence avec transfert des droits" },
];

export default function Agents() {
  const {
    agents,
    delegations,
    applications,
    profiles,
    users,
    session,
    events,
    changeAgentAgency,
  } = useDemo();

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [agentSuggestionsOpen, setAgentSuggestionsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"statistics" | "agency" | "rights">("statistics");
  const [targetDelegationId, setTargetDelegationId] = useState<string>("");
  const [operation, setOperation] = useState<AgencyChangeOperation>("CHANGE_TRANSFER_RIGHTS");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [rightsFilter, setRightsFilter] = useState("");

  const isReadOnly = session!.user.role === "AUDIT_VIEWER";
  const normalizedQuery = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!normalizedQuery) return [];

    return agents.filter((a) => {
      const fullName = `${a.firstName} ${a.lastName}`.toLowerCase();
      return fullName.includes(normalizedQuery) || a.matricule.toLowerCase().includes(normalizedQuery);
    });
  }, [agents, normalizedQuery]);

  useEffect(() => {
    if (matches.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }

    if (!selectedId || !matches.some((a) => a.id === selectedId)) {
      setSelectedId(matches[0].id);
    }
  }, [matches, selectedId]);

  const selected = matches.find((a) => a.id === selectedId) ?? null;
  const hasSelection = selected !== null;

  useEffect(() => {
    if (!selected) return;

    if (!targetDelegationId || targetDelegationId === selected.delegationId) {
      const fallback = delegations.find((d) => d.id !== selected.delegationId)?.id ?? selected.delegationId;
      setTargetDelegationId(fallback);
    }
  }, [selected, targetDelegationId, delegations]);

  const delegationName = (id: string) => delegations.find((d) => d.id === id)?.name ?? "—";
  const appName = (id: string) => applications.find((a) => a.id === id)?.name ?? id;
  const profileName = (id: string) => profiles.find((p) => p.id === id)?.name ?? id;
  const managerName = (id?: string) => users.find((u) => u.id === id)?.name;

  const now = new Date();
  const isOpenRight = (endDate: string) => new Date(endDate) > now;

  const openProfilesCount = selected
    ? new Set(selected.habilitations.filter((h) => isOpenRight(h.endDate)).map((h) => h.profileId)).size
    : 0;

  const openApplicationsCount = selected
    ? new Set(selected.habilitations.filter((h) => isOpenRight(h.endDate)).map((h) => h.applicationId)).size
    : 0;

  const movements = useMemo(
    () => (selected ? events.filter((e) => e.type === "AGENCY_CHANGED" && e.target === `agent:${selected.id}`) : []),
    [events, selected],
  );
  const rights = selected?.habilitations ?? [];

  const rightsRows = useMemo(() => {
    if (!selected) return [];

    const grouped = new Map<
      string,
      {
        id: string;
        profileId: string;
        applicationLabel: string;
        profileLabel: string;
        startDate: string;
        endDate: string;
      }
    >();

    rights.forEach((h) => {
      const key = `${h.applicationId}-${h.profileId}`;
      const current = grouped.get(key);

      if (!current) {
        grouped.set(key, {
          id: key,
          profileId: h.profileId,
          applicationLabel: appName(h.applicationId),
          profileLabel: profileName(h.profileId),
          startDate: h.startDate,
          endDate: h.endDate,
        });
        return;
      }

      grouped.set(key, {
        ...current,
        startDate: new Date(h.startDate) < new Date(current.startDate) ? h.startDate : current.startDate,
        endDate: new Date(h.endDate) > new Date(current.endDate) ? h.endDate : current.endDate,
      });
    });

    return Array.from(grouped.values()).sort((a, b) =>
      `${a.applicationLabel}-${a.profileLabel}`.localeCompare(
        `${b.applicationLabel}-${b.profileLabel}`,
      ),
    );
  }, [selected, rights, applications, profiles]);

  const normalizedRightsFilter = rightsFilter.trim().toLowerCase();
  const filteredRightsRows = useMemo(() => {
    if (!normalizedRightsFilter) return rightsRows;
    return rightsRows.filter((row) => row.profileLabel.toLowerCase().includes(normalizedRightsFilter));
  }, [rightsRows, normalizedRightsFilter]);

  const onValidateAgencyChange = () => {
    if (!selected) return;

    if (!targetDelegationId) {
      toast.error("Veuillez choisir une agence cible.");
      return;
    }

    if (operation !== "STOP_CURRENT_RIGHTS" && targetDelegationId === selected.delegationId) {
      toast.error("L'agence cible doit etre differente de l'agence actuelle.");
      return;
    }

    changeAgentAgency(selected.id, targetDelegationId, operation);
    toast.success("Changement d'agence enregistre.");
    setActiveTab("statistics");
  };


  return (
    <div className="cnss-page space-y-6">
      <PageHeader
        title="Agents"
        subtitle="Recherchez un agent par nom ou matricule, puis gerez ses options."
      />

      {isReadOnly && (
        <AlertBanner tone="info">
          Ce rôle est en consultation uniquement.
        </AlertBanner>
      )}

      <section className="cnss-card space-y-4 p-5">
        <div className="relative space-y-2">
          <Input
            aria-label="Rechercher un agent par nom ou matricule"
            placeholder="Rechercher par nom ou matricule (ex: CNSS-10421)"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setAgentSuggestionsOpen(true);
            }}
            onFocus={() => setAgentSuggestionsOpen(true)}
            onBlur={() => setAgentSuggestionsOpen(false)}
            autoComplete="off"
          />
          {agentSuggestionsOpen && normalizedQuery && (
            <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
              {matches.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">Aucun agent conforme a cette recherche.</p>
              ) : (
                matches.slice(0, 12).map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    className="w-full rounded-sm px-3 py-2 text-left hover:bg-muted/60"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      setQuery(agent.matricule);
                      setSelectedId(agent.id);
                      setAgentSuggestionsOpen(false);
                    }}
                  >
                    <p className="text-sm font-semibold text-foreground">{agent.firstName} {agent.lastName}</p>
                    <p className="font-mono text-xs text-cnss-primary">{agent.matricule}</p>
                  </button>
                ))
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {selected
              ? `${selected.firstName} ${selected.lastName} - ${selected.matricule}`
              : "Saisissez un nom ou un matricule pour charger l'agent."}
          </p>
        </div>
      </section>

      {normalizedQuery && matches.length === 0 ? (
        <EmptyState
          title="Aucun agent trouve"
          description="Essayez un autre nom ou code agent."
          action={{
            label: "Effacer la recherche",
            onClick: () => setQuery(""),
          }}
        />
      ) : (
        <section className="cnss-card space-y-5 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cnss-accent-soft text-cnss-primary">
              <UserCircle2 className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-foreground">
                {selected ? `${selected.firstName} ${selected.lastName}` : "-"}
              </h3>
              <p className="font-mono text-xs text-muted-foreground">{selected ? selected.matricule : "-"}</p>
            </div>
            {selected && (
              <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[selected.status])}>
                {STATUS_LABEL[selected.status]}
              </span>
            )}
          </div>

          <dl className="grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Code agent</dt>
              <dd className="mt-1 font-mono text-foreground">{selected ? selected.matricule : "-"}</dd>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Agence actuelle</dt>
              <dd className="mt-1 text-foreground">{selected ? delegationName(selected.delegationId) : "-"}</dd>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Domaine</dt>
              <dd className="mt-1 text-foreground">{selected ? selected.domain : "-"}</dd>
            </div>
            {selected && managerName(selected.managerId) && (
              <div className="rounded-md border border-border bg-muted/30 p-3 md:col-span-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Responsable</dt>
                <dd className="mt-1 text-foreground">{managerName(selected.managerId)}</dd>
              </div>
            )}
          </dl>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "statistics" | "agency" | "rights")}> 
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-muted/60">
              <TabsTrigger value="statistics">Statistiques</TabsTrigger>
              <TabsTrigger value="agency">Changement d'agence</TabsTrigger>
              <TabsTrigger value="rights">Autorisations agent</TabsTrigger>
            </TabsList>

            <TabsContent value="statistics" className="space-y-3">
              <div className="grid gap-2 md:grid-cols-3">
                <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                  <span className="text-muted-foreground">Profils ouverts</span>
                  <p className="mt-1 text-lg font-semibold text-foreground">{openProfilesCount}</p>
                </div>
                <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                  <span className="text-muted-foreground">Applications accessibles</span>
                  <p className="mt-1 text-lg font-semibold text-foreground">{openApplicationsCount}</p>
                </div>
                <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                  <span className="text-muted-foreground">Mouvements d'agence</span>
                  <p className="mt-1 text-lg font-semibold text-foreground">{movements.length}</p>
                </div>
              </div>

              <Button type="button" variant="outline" onClick={() => setHistoryOpen(true)} disabled={!hasSelection}>
                <History className="mr-2 h-4 w-4" />
                Historique des affectations
              </Button>
            </TabsContent>

            <TabsContent value="agency" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="target-agency">Agence cible</Label>
                <Select value={targetDelegationId} onValueChange={setTargetDelegationId} disabled={!hasSelection || isReadOnly}>
                  <SelectTrigger id="target-agency">
                    <SelectValue placeholder="Choisir l'agence cible" />
                  </SelectTrigger>
                  <SelectContent>
                    {delegations.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 rounded-md border border-border p-3">
                <p className="text-sm font-medium text-foreground">Type d'operation</p>
                <RadioGroup value={operation} onValueChange={(v) => setOperation(v as AgencyChangeOperation)}>
                  {AGENCY_OPERATIONS.map((option) => (
                    <div key={option.value} className="flex items-center gap-2 py-0.5">
                      <RadioGroupItem id={`op-${option.value}`} value={option.value} disabled={isReadOnly || !hasSelection} />
                      <Label htmlFor={`op-${option.value}`} className="cursor-pointer font-normal">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <Button type="button" onClick={onValidateAgencyChange} disabled={isReadOnly || !hasSelection}>
                Valider
              </Button>
            </TabsContent>

            <TabsContent value="rights" className="space-y-4">
              {!hasSelection ? (
                <div className="overflow-x-auto rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead>Agence</TableHead>
                        <TableHead>Application</TableHead>
                        <TableHead>Profil</TableHead>
                        <TableHead>D Debut</TableHead>
                        <TableHead>D Fin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody />
                  </Table>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="rights-filter">Recherche par profil</Label>
                    <Input
                      id="rights-filter"
                      placeholder="Filtrer par profil..."
                      value={rightsFilter}
                      onChange={(event) => setRightsFilter(event.target.value)}
                    />
                  </div>

                  {filteredRightsRows.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                      Aucune ligne correspondant au filtre.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-md border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead>Agence</TableHead>
                            <TableHead>Application</TableHead>
                            <TableHead>Profil</TableHead>
                            <TableHead>D Debut</TableHead>
                            <TableHead>D Fin</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredRightsRows.map((row) => {
                            return (
                              <TableRow key={row.id}>
                                <TableCell>{delegationName(selected.delegationId)}</TableCell>
                                <TableCell>{row.applicationLabel}</TableCell>
                                <TableCell>{row.profileLabel}</TableCell>
                                <TableCell>{formatDate(row.startDate)}</TableCell>
                                <TableCell>{formatDate(row.endDate)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </section>
      )}

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historique des affectations</DialogTitle>
            <DialogDescription>
              Mouvements d'agence enregistres pour {selected?.firstName} {selected?.lastName}.
            </DialogDescription>
          </DialogHeader>
          {movements.length === 0 ? (
            <EmptyState
              title="Aucun mouvement enregistre"
              description="Le journal ne contient pas encore de changement d'agence pour cet agent."
            />
          ) : (
            <div className="max-h-[55vh] space-y-2 overflow-y-auto">
              {movements.map((event) => (
                <div key={event.id} className="rounded-md border border-border bg-muted/30 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{event.details}</p>
                    <span className="text-xs text-muted-foreground">{formatDateTime(event.timestamp)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Action par {event.actorName}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
