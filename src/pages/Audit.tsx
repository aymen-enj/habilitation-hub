import { useMemo, useState } from "react";
import { useDemo } from "@/state/DemoState";
import { PageHeader } from "@/components/cnss/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/cnss/EmptyState";
import { Pagination } from "@/components/cnss/Pagination";
import { formatDateTime } from "@/lib/format";
import { Search, FilePlus2, CheckCircle2, XCircle, LogIn, LogOut, Building2, ShieldOff } from "lucide-react";
import type { AuditEventType } from "@/mocks/types";
import { cn } from "@/lib/utils";

const EVENT_LABEL: Record<AuditEventType, string> = {
  REQUEST_CREATED: "Création de demande",
  REQUEST_APPROVED: "Approbation",
  REQUEST_REJECTED: "Rejet",
  BATCH_CREATED: "Lot créé",
  BATCH_APPROVED: "Lot approuvé",
  BATCH_REJECTED: "Lot rejeté",
  BATCH_PARTIAL: "Lot partiel",
  LOGIN: "Connexion",
  LOGOUT: "Déconnexion",
  AGENCY_CHANGED: "Changement d'agence",
  RIGHT_CLOSED: "Fermeture de droit",
  PROFILE_GRANTED: "Profil attribué",
  PROFILE_SUSPENDED: "Profil suspendu",
};

const EVENT_STYLE: Record<AuditEventType, { wrap: string; icon: typeof FilePlus2 }> = {
  REQUEST_CREATED: { wrap: "bg-cnss-accent-soft text-cnss-primary border-cnss-accent/30", icon: FilePlus2 },
  REQUEST_APPROVED: { wrap: "bg-success-soft text-success border-success/20", icon: CheckCircle2 },
  REQUEST_REJECTED: { wrap: "bg-danger-soft text-danger border-danger/20", icon: XCircle },
  BATCH_CREATED: { wrap: "bg-cnss-accent-soft text-cnss-primary border-cnss-accent/30", icon: FilePlus2 },
  BATCH_APPROVED: { wrap: "bg-success-soft text-success border-success/20", icon: CheckCircle2 },
  BATCH_REJECTED: { wrap: "bg-danger-soft text-danger border-danger/20", icon: XCircle },
  BATCH_PARTIAL: { wrap: "bg-warning-soft text-warning border-warning/20", icon: ShieldOff },
  LOGIN: { wrap: "bg-muted text-muted-foreground border-border", icon: LogIn },
  LOGOUT: { wrap: "bg-muted text-muted-foreground border-border", icon: LogOut },
  AGENCY_CHANGED: { wrap: "bg-cnss-accent-soft text-cnss-primary border-cnss-accent/30", icon: Building2 },
  RIGHT_CLOSED: { wrap: "bg-warning-soft text-warning border-warning/20", icon: ShieldOff },
  PROFILE_GRANTED: { wrap: "bg-success-soft text-success border-success/20", icon: CheckCircle2 },
  PROFILE_SUSPENDED: { wrap: "bg-danger-soft text-danger border-danger/20", icon: ShieldOff },
};

const ITEMS_PER_PAGE = 10;

export default function Audit() {
  const { events } = useDemo();
  const [type, setType] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .filter((e) => (type === "ALL" ? true : e.type === type))
      .filter((e) => {
        if (!q) return true;
        return (
          e.actorName.toLowerCase().includes(q) ||
          e.target.toLowerCase().includes(q) ||
          e.details.toLowerCase().includes(q)
        );
      });
  }, [events, type, query]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  return (
    <div className="cnss-page space-y-6">
      <PageHeader
        title="Journal d'audit"
        subtitle="Chronologie immuable des actions importantes — lecture seule."
      />

      <div className="cnss-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              aria-label="Rechercher dans le journal d'audit"
              placeholder="Rechercher par acteur, cible ou détails…"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="md:w-64" aria-label="Filtrer par type d'évènement">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les types d'évènement</SelectItem>
              {(Object.keys(EVENT_LABEL) as AuditEventType[]).map((t) => (
                <SelectItem key={t} value={t}>{EVENT_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Aucun évènement ne correspond aux filtres"
              description="Modifiez les filtres ou la recherche pour afficher d'autres évènements."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="whitespace-nowrap">Horodatage</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Acteur</TableHead>
                  <TableHead className="hidden md:table-cell">Cible</TableHead>
                  <TableHead>Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEvents.map((e) => {
                  const cfg = EVENT_STYLE[e.type];
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {formatDateTime(e.timestamp)}
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", cfg.wrap)}>
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          {EVENT_LABEL[e.type]}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-foreground">{e.actorName}</TableCell>
                      <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">{e.target}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.details}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {filtered.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
            className="border-t border-border"
          />
        )}
      </div>
    </div>
  );
}
