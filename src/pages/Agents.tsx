import { useMemo, useState } from "react";
import { Search, UserCircle2, Building2, Briefcase } from "lucide-react";
import { useDemo } from "@/state/DemoState";
import { PageHeader } from "@/components/cnss/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/cnss/EmptyState";
import { AlertBanner } from "@/components/cnss/AlertBanner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import type { AgentStatus } from "@/mocks/types";

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

export default function Agents() {
  const { agents, delegations, applications, profiles, modules, users, session } = useDemo();
  const [query, setQuery] = useState("");
  const [delegation, setDelegation] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(agents[0]?.id ?? null);

  const isReadOnly = session!.user.role === "AUDIT_VIEWER";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return agents.filter((a) => {
      if (delegation !== "ALL" && a.delegationId !== delegation) return false;
      if (status !== "ALL" && a.status !== status) return false;
      if (!q) return true;
      const fullName = `${a.firstName} ${a.lastName}`.toLowerCase();
      return fullName.includes(q) || a.matricule.toLowerCase().includes(q);
    });
  }, [agents, query, delegation, status]);

  const selected = filtered.find((a) => a.id === selectedId) ?? filtered[0] ?? null;

  const delegationName = (id: string) => delegations.find((d) => d.id === id)?.name ?? "—";
  const appName = (id: string) => applications.find((a) => a.id === id)?.name ?? id;
  const profileName = (id: string) => profiles.find((p) => p.id === id)?.name ?? id;
  const moduleName = (id: string) => modules.find((m) => m.id === id)?.name ?? id;
  const managerName = (id?: string) => users.find((u) => u.id === id)?.name;

  return (
    <div className="cnss-page space-y-6">
      <PageHeader
        title="Agents"
        subtitle="Parcourez les agents et inspectez leurs habilitations actives."
      />

      {isReadOnly && (
        <AlertBanner tone="info">
          Ce rôle est en consultation uniquement.
        </AlertBanner>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="cnss-card overflow-hidden">
          {/* Filter bar */}
          <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                aria-label="Rechercher par nom ou matricule"
                placeholder="Rechercher par nom ou matricule…"
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select value={delegation} onValueChange={setDelegation}>
              <SelectTrigger className="md:w-56" aria-label="Filtrer par délégation">
                <SelectValue placeholder="Toutes les délégations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes les délégations</SelectItem>
                {delegations.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="md:w-44" aria-label="Filtrer par statut">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                <SelectItem value="ACTIF">Actif</SelectItem>
                <SelectItem value="INACTIF">Inactif</SelectItem>
                <SelectItem value="SUSPENDU">Suspendu</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Aucun agent ne correspond aux filtres"
                description="Ajustez votre recherche ou réinitialisez les filtres pour afficher davantage de résultats."
                action={{
                  label: "Réinitialiser les filtres",
                  onClick: () => {
                    setQuery("");
                    setDelegation("ALL");
                    setStatus("ALL");
                  },
                }}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Nom</TableHead>
                    <TableHead>Matricule</TableHead>
                    <TableHead className="hidden md:table-cell">Délégation</TableHead>
                    <TableHead className="hidden lg:table-cell">Domaine</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => {
                    const isSelected = selected?.id === a.id;
                    return (
                      <TableRow
                        key={a.id}
                        onClick={() => setSelectedId(a.id)}
                        className={cn(
                          "cursor-pointer transition-colors",
                          isSelected && "bg-cnss-accent-soft hover:bg-cnss-accent-soft",
                        )}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedId(a.id);
                          }
                        }}
                        aria-selected={isSelected}
                      >
                        <TableCell className="font-medium text-foreground">
                          {a.firstName} {a.lastName}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{a.matricule}</TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                          {delegationName(a.delegationId)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="outline" className="font-normal">{a.domain}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[a.status])}>
                            {STATUS_LABEL[a.status]}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <aside aria-label="Détails de l'agent sélectionné" className="cnss-card sticky top-20 h-fit p-5">
          {!selected ? (
            <EmptyState
              title="Aucun agent sélectionné"
              description="Sélectionnez un agent dans la liste pour afficher ses informations."
            />
          ) : (
            <div className="space-y-5 animate-fade-in">
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

              <dl className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Délégation</dt>
                    <dd className="text-foreground">{delegationName(selected.delegationId)}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Domaine</dt>
                    <dd className="text-foreground">{selected.domain}</dd>
                  </div>
                </div>
                {managerName(selected.managerId) && (
                  <div className="flex items-start gap-2">
                    <UserCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Responsable</dt>
                      <dd className="text-foreground">{managerName(selected.managerId)}</dd>
                    </div>
                  </div>
                )}
              </dl>

              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Habilitations actives ({selected.habilitations.length})
                </h4>
                {selected.habilitations.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                    Aucune habilitation active pour cet agent.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {selected.habilitations.map((h) => (
                      <li key={h.id} className="rounded-lg border border-border bg-muted/30 p-3">
                        <p className="text-sm font-medium text-foreground">{appName(h.applicationId)}</p>
                        <p className="text-xs text-muted-foreground">
                          {profileName(h.profileId)} · {moduleName(h.moduleId)}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Du {formatDate(h.startDate)} au {formatDate(h.endDate)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
