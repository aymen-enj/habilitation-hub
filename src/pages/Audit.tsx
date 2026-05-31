import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/cnss/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/cnss/EmptyState";
import { Pagination } from "@/components/cnss/Pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { Search, CheckCircle2, ShieldOff, LogIn, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const API = import.meta.env.VITE_API_URL;

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuditEventDTO {
  id: number;
  timestamp: string | null;
  type: string;
  acteur: string | null;
  cible: string | null;
  details: string | null;
}

type DbEventType = "ACCES_PROFIL_OUVERT" | "ACCES_PROFIL_FERME" | "LOGIN" | "AGENCE_CHANGEE" | "PROFIL_ATTRIBUE" | "PROFIL_SUSPENDU";

const EVENT_LABEL: Record<DbEventType, string> = {
  ACCES_PROFIL_OUVERT: "Profil ouvert (trigger)",
  ACCES_PROFIL_FERME:  "Profil fermé",
  LOGIN:               "Connexion",
  AGENCE_CHANGEE:      "Changement d'agence",
  PROFIL_ATTRIBUE:     "Profil attribué",
  PROFIL_SUSPENDU:     "Profil suspendu",
};

const EVENT_STYLE: Record<DbEventType, { wrap: string; icon: typeof CheckCircle2 }> = {
  ACCES_PROFIL_OUVERT: { wrap: "bg-success-soft text-success border-success/20",               icon: CheckCircle2 },
  ACCES_PROFIL_FERME:  { wrap: "bg-warning-soft text-warning border-warning/20",               icon: ShieldOff    },
  LOGIN:               { wrap: "bg-muted text-muted-foreground border-border",                 icon: LogIn        },
  AGENCE_CHANGEE:      { wrap: "bg-cnss-accent-soft text-cnss-primary border-cnss-accent/30", icon: Building2    },
  PROFIL_ATTRIBUE:     { wrap: "bg-success-soft text-success border-success/20",               icon: CheckCircle2 },
  PROFIL_SUSPENDU:     { wrap: "bg-warning-soft text-warning border-warning/20",               icon: ShieldOff    },
};

const DEFAULT_STYLE = { wrap: "bg-muted text-muted-foreground border-border", icon: LogIn };

const ITEMS_PER_PAGE = 10;

// ─────────────────────────────────────────────────────────────────────────────

export default function Audit() {
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [query,      setQuery]      = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: events = [], isLoading } = useQuery<AuditEventDTO[]>({
    queryKey: ["audit"],
    queryFn: () => fetch(`${API}/audit`).then((r) => r.json()),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      const matchType = typeFilter === "ALL" || e.type === typeFilter;
      const matchQuery = !q || [e.acteur, e.cible, e.details]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
      return matchType && matchQuery;
    });
  }, [events, typeFilter, query]);

  useEffect(() => { setCurrentPage(1); }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageData   = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="md:w-64" aria-label="Filtrer par type d'évènement">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="bottom" avoidCollisions={false}>
              <SelectItem value="ALL">Tous les types d'évènement</SelectItem>
              {(Object.keys(EVENT_LABEL) as DbEventType[]).map((t) => (
                <SelectItem key={t} value={t}>{EVENT_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-0 divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-28 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-48" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
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
                  <TableHead className="whitespace-nowrap font-semibold">Horodatage</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Acteur</TableHead>
                  <TableHead className="hidden font-semibold md:table-cell">Cible</TableHead>
                  <TableHead className="font-semibold">Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.map((e) => {
                  const cfg = EVENT_STYLE[e.type as DbEventType] ?? DEFAULT_STYLE;
                  const Icon = cfg.icon;
                  const label = EVENT_LABEL[e.type as DbEventType] ?? e.type;
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {e.timestamp ? formatDateTime(e.timestamp) : "—"}
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", cfg.wrap)}>
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          {label}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-foreground">{e.acteur ?? "—"}</TableCell>
                      <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">{e.cible ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.details ?? "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
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
