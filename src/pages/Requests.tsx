import { useEffect, useMemo, useState } from "react";
import { Calendar, Filter, RefreshCw, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/cnss/PageHeader";
import { AlertBanner } from "@/components/cnss/AlertBanner";
import { Pagination } from "@/components/cnss/Pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";

const API = import.meta.env.VITE_API_URL;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConsultationDTO {
  accId: number;
  codeAgent: string;
  nomAgent: string;
  codeAgence: string;
  nomAgence: string;
  codeProfil: number;
  nomProfil: string;
  codeApplication: number | null;
  nomApplication: string | null;
  dateDebut: string | null;
  dateFin: string | null;
  consultation: string;
  saisie: string;
  validation: string;
  controle: string;
}

interface DelegationDTO  { code: string; nom: string; etat: string; }
interface ApplicationDTO { code: number; nom: string; abreviation: string; }
interface ProfilDTO      { id: number;  nom: string; abreviation: string; dateCreation: string | null; }

type SortBy = "agent" | "agence" | "application" | "date";

const RESULTS_PER_PAGE = 10;

// ─────────────────────────────────────────────────────────────────────────────

export default function Requests() {
  // Filtres (valeurs du formulaire)
  const [codeAgence,      setCodeAgence]      = useState("");
  const [codeApplication, setCodeApplication] = useState("");
  const [codeProfil,      setCodeProfil]      = useState("");
  const [dateDebut,       setDateDebut]       = useState("");
  const [dateFin,         setDateFin]         = useState("");
  const [sortBy,          setSortBy]          = useState<SortBy>("agent");
  const [page,            setPage]            = useState(1);

  // Filtres "actifs" — mis à jour uniquement au clic sur Exécuter
  const [activeFilters, setActiveFilters] = useState<{
    codeAgence: string; codeApplication: string; codeProfil: string;
    dateDebut: string;  dateFin: string;
  } | null>(null);

  // ── Données des dropdowns ──────────────────────────────────────────────────

  const { data: delegations = [] } = useQuery<DelegationDTO[]>({
    queryKey: ["delegations"],
    queryFn: () => fetch(`${API}/delegations`).then((r) => r.json()),
  });

  const { data: applications = [] } = useQuery<ApplicationDTO[]>({
    queryKey: ["parametrage-applications"],
    queryFn: () => fetch(`${API}/parametrage/applications`).then((r) => r.json()),
  });

  const { data: profils = [] } = useQuery<ProfilDTO[]>({
    queryKey: ["profils"],
    queryFn: () => fetch(`${API}/profils`).then((r) => r.json()),
  });

  // ── Requête principale — lancée seulement après Exécuter ──────────────────

  const queryParams = useMemo(() => {
    if (!activeFilters) return null;
    const p = new URLSearchParams();
    if (activeFilters.codeAgence)      p.set("codeAgence",      activeFilters.codeAgence);
    if (activeFilters.codeApplication) p.set("codeApplication", activeFilters.codeApplication);
    if (activeFilters.codeProfil)      p.set("codeProfil",      activeFilters.codeProfil);
    if (activeFilters.dateDebut)       p.set("dateDebut",       activeFilters.dateDebut);
    if (activeFilters.dateFin)         p.set("dateFin",         activeFilters.dateFin);
    return p.toString();
  }, [activeFilters]);

  const { data: resultats = [], isLoading } = useQuery<ConsultationDTO[]>({
    queryKey: ["consultation", queryParams],
    queryFn: () =>
      fetch(`${API}/consultation${queryParams ? `?${queryParams}` : ""}`).then((r) => r.json()),
    enabled: activeFilters !== null,
  });

  // Revenir à la page 1 quand les résultats changent
  useEffect(() => { setPage(1); }, [resultats]);

  // ── Tri côté client ────────────────────────────────────────────────────────

  const resultsTries = useMemo(() => {
    return [...resultats].sort((a, b) => {
      switch (sortBy) {
        case "agent":       return a.nomAgent.localeCompare(b.nomAgent);
        case "agence":      return (a.nomAgence ?? "").localeCompare(b.nomAgence ?? "");
        case "application": return (a.nomApplication ?? "").localeCompare(b.nomApplication ?? "");
        case "date":        return (a.dateDebut ?? "").localeCompare(b.dateDebut ?? "");
        default:            return 0;
      }
    });
  }, [resultats, sortBy]);

  // ── Pagination ────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(resultsTries.length / RESULTS_PER_PAGE));
  const pageData   = resultsTries.slice((page - 1) * RESULTS_PER_PAGE, page * RESULTS_PER_PAGE);

  // ── Statut habilitation ───────────────────────────────────────────────────

  function getStatut(dateFin: string | null) {
    if (!dateFin) return "actif";
    return new Date(dateFin) < new Date() ? "expire" : "actif";
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleExecute = () => {
    setActiveFilters({ codeAgence, codeApplication, codeProfil, dateDebut, dateFin });
  };

  const handleReset = () => {
    setCodeAgence(""); setCodeApplication(""); setCodeProfil("");
    setDateDebut(""); setDateFin("");
    setActiveFilters(null);
    setPage(1);
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="cnss-page space-y-6">
      <PageHeader
        title="Consultation"
        subtitle="Recherche et consultation des habilitations"
      />

      <AlertBanner tone="info" title="Périmètre actuel">
        Cette page permet de consulter les habilitations existantes avec des filtres avancés.
      </AlertBanner>

      {/* ── Filtres ── */}
      <Card className="border-border/50 bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Critères de recherche</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {/* Agence */}
          <div className="space-y-2">
            <Label htmlFor="agency-select" className="text-sm font-medium">Agence/DR</Label>
            <Select value={codeAgence} onValueChange={setCodeAgence}>
              <SelectTrigger id="agency-select" className="h-9">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent side="bottom" avoidCollisions={false} className="max-h-60 overflow-y-auto">
                {delegations.map((d) => (
                  <SelectItem key={d.code} value={d.code}>{d.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Application */}
          <div className="space-y-2">
            <Label htmlFor="app-select" className="text-sm font-medium">Application</Label>
            <Select value={codeApplication} onValueChange={setCodeApplication}>
              <SelectTrigger id="app-select" className="h-9">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent side="bottom" avoidCollisions={false} className="max-h-60 overflow-y-auto">
                {applications.map((a) => (
                  <SelectItem key={a.code} value={String(a.code)}>{a.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Profil */}
          <div className="space-y-2">
            <Label htmlFor="profile-select" className="text-sm font-medium">Profil</Label>
            <Select value={codeProfil} onValueChange={setCodeProfil}>
              <SelectTrigger id="profile-select" className="h-9">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent side="bottom" avoidCollisions={false} className="max-h-60 overflow-y-auto">
                {profils.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date début */}
          <div className="space-y-2">
            <Label htmlFor="date-start" className="text-sm font-medium">Début</Label>
            <Input
              id="date-start"
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Date fin */}
          <div className="space-y-2">
            <Label htmlFor="date-end" className="text-sm font-medium">Fin</Label>
            <Input
              id="date-end"
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Tri */}
          <div className="space-y-2">
            <Label htmlFor="sort-select" className="text-sm font-medium">Trier par</Label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger id="sort-select" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="agence">Agence</SelectItem>
                <SelectItem value="application">Application</SelectItem>
                <SelectItem value="date">Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button onClick={handleExecute} className="gap-2 bg-cnss-accent hover:bg-cnss-accent/90">
            <Search className="h-4 w-4" />
            Exécuter
          </Button>
          <Button onClick={handleReset} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Réinitialiser
          </Button>
        </div>
      </Card>

      {/* ── Résultats ── */}
      {activeFilters !== null && (
        isLoading ? (
          <div className="cnss-card overflow-hidden">
            <div className="border-b border-border p-4">
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="space-y-0 divide-y divide-border">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="cnss-card overflow-hidden">
            <div className="border-b border-border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">
                  Résultats ({resultsTries.length})
                </h3>
                <Badge variant="secondary" className="gap-1.5">
                  <Calendar className="h-3 w-3" />
                  {resultsTries.length} habilitation(s)
                </Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold">Agence</TableHead>
                    <TableHead className="font-semibold">Agent</TableHead>
                    <TableHead className="font-semibold">Application</TableHead>
                    <TableHead className="font-semibold">Profil</TableHead>
                    <TableHead className="font-semibold">D. Début</TableHead>
                    <TableHead className="font-semibold">D. Fin</TableHead>
                    <TableHead className="font-semibold">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.length > 0 ? (
                    pageData.map((h) => {
                      const statut = getStatut(h.dateFin);
                      return (
                        <TableRow key={h.accId}>
                          <TableCell className="text-sm text-muted-foreground">{h.nomAgence}</TableCell>
                          <TableCell className="font-medium text-foreground">{h.nomAgent}</TableCell>
                          <TableCell className="text-sm text-foreground">{h.nomApplication ?? "—"}</TableCell>
                          <TableCell className="text-sm text-foreground">{h.nomProfil}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {h.dateDebut ? formatDate(h.dateDebut) : "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {h.dateFin ? formatDate(h.dateFin) : (
                              <span className="text-xs font-medium text-success">Ouvert</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {statut === "expire" ? (
                              <Badge variant="destructive" className="bg-red-500/90">Expiré</Badge>
                            ) : (
                              <Badge className="bg-green-500/90">Actif</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        Aucune habilitation ne correspond aux critères
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={resultsTries.length}
              itemsPerPage={RESULTS_PER_PAGE}
              onPageChange={setPage}
            />
          </div>
        )
      )}

      {activeFilters === null && (
        <Card className="border-dashed border-border/50 bg-muted/20 p-8 text-center">
          <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Utilisez les filtres ci-dessus et cliquez sur "Exécuter" pour consulter les habilitations
          </p>
        </Card>
      )}
    </div>
  );
}
