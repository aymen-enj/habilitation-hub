import { useEffect, useMemo, useState } from "react";
import { Search, UserCircle2, Building2, Briefcase, History } from "lucide-react";
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
    modules,
    users,
    session,
    events,
    changeAgentAgency,
    closeAgentRight,
  } = useDemo();

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"statistics" | "agency" | "rights">("statistics");
  const [targetDelegationId, setTargetDelegationId] = useState<string>("");
  const [operation, setOperation] = useState<AgencyChangeOperation>("CHANGE_TRANSFER_RIGHTS");
  const [historyOpen, setHistoryOpen] = useState(false);

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
  const moduleName = (id: string) => modules.find((m) => m.id === id)?.name ?? id;
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

  const onCloseRight = (agentId: string, rightId: string) => {
    closeAgentRight(agentId, rightId);
    toast.success("Le droit a ete ferme.");
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
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Rechercher un agent par nom ou matricule"
            placeholder="Rechercher un agent par nom ou matricule..."
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {normalizedQuery && matches.length > 1 && (
          <div className="space-y-2">
            <Label htmlFor="agent-result">Resultats ({matches.length})</Label>
            <Select value={selectedId ?? matches[0]?.id ?? ""} onValueChange={setSelectedId}>
              <SelectTrigger id="agent-result">
                <SelectValue placeholder="Choisir un agent" />
              </SelectTrigger>
              <SelectContent>
                {matches.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.firstName} {a.lastName} - {a.matricule}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </section>

      {!normalizedQuery ? (
        <EmptyState
          title="Saisissez un nom ou un matricule"
          description="La fiche agent s'affiche apres recherche."
        />
      ) : matches.length === 0 ? (
        <EmptyState
          title="Aucun agent trouve"
          description="Essayez un autre nom ou code agent."
          action={{
            label: "Effacer la recherche",
            onClick: () => setQuery(""),
          }}
        />
      ) : selected ? (
        <section className="cnss-card space-y-5 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cnss-accent-soft text-cnss-primary">
              <UserCircle2 className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-foreground">
                {selected.firstName} {selected.lastName}
              </h3>
              <p className="font-mono text-xs text-muted-foreground">{selected.matricule}</p>
            </div>
            <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[selected.status])}>
              {STATUS_LABEL[selected.status]}
            </span>
          </div>

          <dl className="grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Code agent</dt>
              <dd className="mt-1 font-mono text-foreground">{selected.matricule}</dd>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Agence actuelle</dt>
              <dd className="mt-1 text-foreground">{delegationName(selected.delegationId)}</dd>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Domaine</dt>
              <dd className="mt-1 text-foreground">{selected.domain}</dd>
            </div>
            {managerName(selected.managerId) && (
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

              <Button type="button" variant="outline" onClick={() => setHistoryOpen(true)}>
                <History className="mr-2 h-4 w-4" />
                Historique des affectations
              </Button>
            </TabsContent>

            <TabsContent value="agency" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="target-agency">Agence cible</Label>
                <Select value={targetDelegationId} onValueChange={setTargetDelegationId}>
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
                      <RadioGroupItem id={`op-${option.value}`} value={option.value} disabled={isReadOnly} />
                      <Label htmlFor={`op-${option.value}`} className="cursor-pointer font-normal">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <Button type="button" onClick={onValidateAgencyChange} disabled={isReadOnly}>
                Valider
              </Button>
            </TabsContent>

            <TabsContent value="rights" className="space-y-3">
              {selected.habilitations.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                  Aucune autorisation pour cet agent.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead>Agence</TableHead>
                        <TableHead>Application</TableHead>
                        <TableHead>Profil</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead>D Debut</TableHead>
                        <TableHead>D Fin</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selected.habilitations.map((h) => {
                        const open = isOpenRight(h.endDate);
                        return (
                          <TableRow key={h.id}>
                            <TableCell>{delegationName(selected.delegationId)}</TableCell>
                            <TableCell>{appName(h.applicationId)}</TableCell>
                            <TableCell>{profileName(h.profileId)}</TableCell>
                            <TableCell>{moduleName(h.moduleId)}</TableCell>
                            <TableCell>{formatDate(h.startDate)}</TableCell>
                            <TableCell>{formatDate(h.endDate)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant={open ? "outline" : "secondary"}
                                disabled={isReadOnly || !open}
                                onClick={() => onCloseRight(selected.id, h.id)}
                              >
                                {open ? "Fermer droit" : "Droit ferme"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </section>
      ) : null}

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
