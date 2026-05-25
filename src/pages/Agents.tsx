import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserCircle2, History } from "lucide-react";
import { useDemo } from "@/state/DemoState";
import { PageHeader } from "@/components/cnss/PageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/cnss/EmptyState";
import { AlertBanner } from "@/components/cnss/AlertBanner";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
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

const API = import.meta.env.VITE_API_URL;

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentDTO {
  codeAgent: string;
  nomComplet: string;
  etat: string | null;
  poste: string | null;
  codeDelegation: string | null;
  nomDelegation: string | null;
}

interface HabilitationDTO {
  accId: number;
  nomProfil: string;
  nomDelegation: string | null;
  nomApplication: string | null;
  dateDebut: string;
  dateFin: string | null;
  consultation: string;
  saisie: string;
  validation: string;
  controle: string;
}

interface DelegationDTO {
  code: string;
  nom: string;
  etat: string;
}

interface AgentDelegHistDTO {
  codeDelegation: string;
  nomDelegation: string;
  dateDebut: string;
  dateFin: string | null;
}

type AgencyChangeOperation =
  | "FIRST_ASSIGNMENT"
  | "STOP_CURRENT_RIGHTS"
  | "CHANGE_STOP_RIGHTS"
  | "CHANGE_TRANSFER_RIGHTS";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStatutLabel(etat: string | null) {
  if (etat === "A") return "Actif";
  if (etat === "I") return "Inactif";
  return "Inconnu";
}

function getStatutStyle(etat: string | null) {
  if (etat === "A") return "bg-success-soft text-success border-success/20";
  return "bg-muted text-muted-foreground border-border";
}

const AGENCY_OPERATIONS: Array<{ value: AgencyChangeOperation; label: string }> = [
  { value: "FIRST_ASSIGNMENT",       label: "Première affectation à une agence" },
  { value: "STOP_CURRENT_RIGHTS",    label: "Arrêt total des droits dans l'agence actuelle" },
  { value: "CHANGE_STOP_RIGHTS",     label: "Changement d'agence avec arrêt total des droits" },
  { value: "CHANGE_TRANSFER_RIGHTS", label: "Changement d'agence avec transfert des droits" },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function Agents() {
  const { session } = useDemo();
  const isReadOnly = session!.user.role === "AUDIT_VIEWER";
  const queryClient = useQueryClient();

  // L'agent sélectionné est stocké en entier — plus de dépendance aux résultats de recherche
  const [selectedAgent, setSelectedAgent]     = useState<AgentDTO | null>(null);
  const [query, setQuery]                     = useState("");
  const [debouncedQuery, setDebouncedQuery]   = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeTab, setActiveTab]             = useState<"statistics" | "agency" | "rights">("statistics");
  const [targetDelegCode, setTargetDelegCode] = useState<string>("");
  const [operation, setOperation]             = useState<AgencyChangeOperation>("CHANGE_TRANSFER_RIGHTS");
  const [historyOpen, setHistoryOpen]         = useState(false);
  const [rightsFilter, setRightsFilter]       = useState("");
  const [showClosedHabs, setShowClosedHabs]   = useState(false);
  const [habsPage, setHabsPage]               = useState(1);
  const HABS_PER_PAGE = 10;

  // Debounce : 300 ms après la dernière frappe
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Vider la sélection quand la recherche est effacée
  useEffect(() => {
    if (debouncedQuery.length < 2) setSelectedAgent(null);
  }, [debouncedQuery]);

  // ── Requêtes API ─────────────────────────────────────────────────────────────

  const { data: agentResults = [] } = useQuery<AgentDTO[]>({
    queryKey: ["agents-search", debouncedQuery],
    queryFn: () =>
      fetch(`${API}/agents?q=${encodeURIComponent(debouncedQuery)}`).then((r) => r.json()),
    enabled: debouncedQuery.length >= 2,
  });

  // Clé stable basée sur le code de l'agent sélectionné
  const { data: habilitations = [], isLoading: habLoading } = useQuery<HabilitationDTO[]>({
    queryKey: ["habilitations", selectedAgent?.codeAgent ?? ""],
    queryFn: () =>
      fetch(`${API}/agents/${selectedAgent!.codeAgent}/habilitations`).then((r) => r.json()),
    enabled: !!selectedAgent,
  });

  const { data: delegations = [] } = useQuery<DelegationDTO[]>({
    queryKey: ["delegations"],
    queryFn: () => fetch(`${API}/delegations`).then((r) => r.json()),
  });

  const { data: historique = [] } = useQuery<AgentDelegHistDTO[]>({
    queryKey: ["historique", selectedAgent?.codeAgent ?? ""],
    queryFn: () =>
      fetch(`${API}/agents/${selectedAgent!.codeAgent}/historique`).then((r) => r.json()),
    enabled: !!selectedAgent,
  });

  const changerAgenceMutation = useMutation({
    mutationFn: (body: { operation: string; agenceCible?: string; loginSaisie: string }) =>
      fetch(`${API}/agents/${selectedAgent!.codeAgent}/changer-agence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Erreur serveur");
        return data;
      }),
    onSuccess: async (data) => {
      // Rafraîchir la carte agent pour afficher la nouvelle agence
      const code = selectedAgent!.codeAgent;
      const updated = await fetch(`${API}/agents/${code}`).then((r) => r.json());
      setSelectedAgent(updated);

      // Invalider les caches liés à cet agent
      queryClient.invalidateQueries({ queryKey: ["habilitations", code] });
      queryClient.invalidateQueries({ queryKey: ["historique", code] });
      queryClient.invalidateQueries({ queryKey: ["agents-search"] });

      // Afficher un message d'avertissement si la matrice n'a trouvé aucun profil
      if (data?.info) {
        toast.warning(data.info);
      } else {
        toast.success("Changement d'agence effectué avec succès.");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Initialiser l'agence cible quand l'agent sélectionné change
  useEffect(() => {
    if (!selectedAgent || delegations.length === 0) return;
    const fallback =
      delegations.find((d) => d.code !== selectedAgent.codeDelegation)?.code ??
      delegations[0]?.code ??
      "";
    setTargetDelegCode((prev) =>
      prev && prev !== selectedAgent.codeDelegation ? prev : fallback,
    );
  }, [selectedAgent, delegations]);

  // ── Statistiques ─────────────────────────────────────────────────────────────

  const openHabs = useMemo(
    () => habilitations.filter((h) => h.dateFin === null),
    [habilitations],
  );
  const openProfilesCount     = new Set(openHabs.map((h) => h.nomProfil)).size;
  const openApplicationsCount = new Set(
    openHabs.filter((h) => h.nomApplication).map((h) => h.nomApplication),
  ).size;

  // ── Filtre onglet Autorisations ───────────────────────────────────────────────

  const normalizedRightsFilter = rightsFilter.trim().toLowerCase();
  const filteredHabs = useMemo(() => {
    let base = showClosedHabs ? habilitations : habilitations.filter((h) => h.dateFin === null);
    if (normalizedRightsFilter) {
      base = base.filter((h) => h.nomProfil.toLowerCase().includes(normalizedRightsFilter));
    }
    return base;
  }, [habilitations, normalizedRightsFilter, showClosedHabs]);

  // Remettre à la page 1 quand le filtre ou l'agent change
  useEffect(() => { setHabsPage(1); }, [filteredHabs]);

  const habsTotalPages = Math.max(1, Math.ceil(filteredHabs.length / HABS_PER_PAGE));
  const habsPageData   = filteredHabs.slice((habsPage - 1) * HABS_PER_PAGE, habsPage * HABS_PER_PAGE);

  const hasSelection = !!selectedAgent;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="cnss-page space-y-6">
      <PageHeader
        title="Agents"
        subtitle="Recherchez un agent par nom ou code, puis gérez ses options."
      />

      {isReadOnly && (
        <AlertBanner tone="info">Ce rôle est en consultation uniquement.</AlertBanner>
      )}

      {/* Barre de recherche */}
      <section className="cnss-card space-y-4 p-5">
        <div className="relative space-y-2">
          <Input
            aria-label="Rechercher un agent"
            placeholder="Rechercher par nom ou code agent (ex : ALAOUI ou R0289) — min. 2 caractères"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSuggestionsOpen(true);
            }}
            onFocus={() => setSuggestionsOpen(true)}
            onBlur={() => setSuggestionsOpen(false)}
            autoComplete="off"
          />

          {suggestionsOpen && debouncedQuery.length >= 2 && (
            <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
              {agentResults.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">Aucun agent trouvé.</p>
              ) : (
                agentResults.slice(0, 12).map((agent) => (
                  <button
                    key={agent.codeAgent}
                    type="button"
                    className="w-full rounded-sm px-3 py-2 text-left hover:bg-muted/60"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      // On stocke l'objet complet — plus de désynchronisation possible
                      setSelectedAgent(agent);
                      setQuery(agent.nomComplet);
                      setSuggestionsOpen(false);
                      setRightsFilter("");
                      setActiveTab("statistics");
                    }}
                  >
                    <p className="text-sm font-semibold text-foreground">{agent.nomComplet}</p>
                    <p className="font-mono text-xs text-cnss-primary">{agent.codeAgent}</p>
                  </button>
                ))
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {selectedAgent
              ? `${selectedAgent.nomComplet} — ${selectedAgent.codeAgent}`
              : "Saisissez un nom ou un code pour charger l'agent."}
          </p>
        </div>
      </section>

      {/* Zone principale — toujours visible, affiche "—" si rien n'est sélectionné */}
      <section className="cnss-card space-y-5 p-5">
        {/* En-tête agent */}
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cnss-accent-soft text-cnss-primary">
            <UserCircle2 className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-foreground">
              {selectedAgent ? selectedAgent.nomComplet : "—"}
            </h3>
            <p className="font-mono text-xs text-muted-foreground">
              {selectedAgent ? selectedAgent.codeAgent : "—"}
            </p>
          </div>
          {selectedAgent && (
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                getStatutStyle(selectedAgent.etat),
              )}
            >
              {getStatutLabel(selectedAgent.etat)}
            </span>
          )}
        </div>

        {/* Carte infos */}
        <dl className="grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Code agent</dt>
            <dd className="mt-1 font-mono text-foreground">{selectedAgent?.codeAgent ?? "—"}</dd>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Agence actuelle</dt>
            <dd className="mt-1 text-foreground">{selectedAgent?.nomDelegation ?? "—"}</dd>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Poste</dt>
            <dd className="mt-1 text-foreground">{selectedAgent?.poste ?? "—"}</dd>
          </div>
        </dl>

        {/* Onglets */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-muted/60">
            <TabsTrigger value="statistics">Statistiques</TabsTrigger>
            <TabsTrigger value="agency">Changement d'agence</TabsTrigger>
            <TabsTrigger value="rights">Autorisations agent</TabsTrigger>
          </TabsList>

          {/* ── Statistiques ── */}
          <TabsContent value="statistics" className="space-y-3">
            <div className="grid gap-2 md:grid-cols-3">
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                <span className="text-muted-foreground">Profils ouverts</span>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {habLoading ? "…" : hasSelection ? openProfilesCount : "—"}
                </p>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                <span className="text-muted-foreground">Applications accessibles</span>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {habLoading ? "…" : hasSelection ? openApplicationsCount : "—"}
                </p>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                <span className="text-muted-foreground">Mouvements d'agence</span>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {hasSelection ? historique.length : "—"}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setHistoryOpen(true)}
              disabled={!hasSelection}
            >
              <History className="mr-2 h-4 w-4" />
              Historique des affectations
            </Button>
          </TabsContent>

          {/* ── Changement d'agence ── */}
          <TabsContent value="agency" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="target-agency">Agence cible</Label>
              <Select
                value={targetDelegCode}
                onValueChange={setTargetDelegCode}
                disabled={!hasSelection || isReadOnly}
              >
                <SelectTrigger id="target-agency">
                  <SelectValue placeholder="Choisir l'agence cible" />
                </SelectTrigger>
                <SelectContent>
                  {delegations.map((d) => (
                    <SelectItem key={d.code} value={d.code}>
                      {d.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 rounded-md border border-border p-3">
              <p className="text-sm font-medium text-foreground">Type d'opération</p>
              <RadioGroup
                value={operation}
                onValueChange={(v) => setOperation(v as AgencyChangeOperation)}
              >
                {AGENCY_OPERATIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center gap-2 py-0.5">
                    <RadioGroupItem
                      id={`op-${opt.value}`}
                      value={opt.value}
                      disabled={isReadOnly || !hasSelection}
                    />
                    <Label htmlFor={`op-${opt.value}`} className="cursor-pointer font-normal">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Button
              type="button"
              onClick={() => {
                // Validation côté client avant d'envoyer
                if (operation === "FIRST_ASSIGNMENT" && selectedAgent?.codeDelegation) {
                  toast.error("Cet agent est déjà affecté à une agence.");
                  return;
                }
                if (operation === "STOP_CURRENT_RIGHTS" && openHabs.length === 0) {
                  toast.error("Aucun droit ouvert à clôturer pour cet agent.");
                  return;
                }
                if (
                  (operation === "CHANGE_STOP_RIGHTS" || operation === "CHANGE_TRANSFER_RIGHTS") &&
                  !targetDelegCode
                ) {
                  toast.error("Veuillez sélectionner une agence cible.");
                  return;
                }
                changerAgenceMutation.mutate({
                  operation,
                  agenceCible: operation !== "STOP_CURRENT_RIGHTS" ? targetDelegCode : undefined,
                  loginSaisie: session?.user?.id ?? "SYSTEM",
                });
              }}
              disabled={isReadOnly || !hasSelection || changerAgenceMutation.isPending}
            >
              {changerAgenceMutation.isPending ? "Traitement…" : "Valider"}
            </Button>
          </TabsContent>

          {/* ── Autorisations ── */}
          <TabsContent value="rights" className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="rights-filter">Recherche par profil</Label>
                <Input
                  id="rights-filter"
                  placeholder="Filtrer par profil..."
                  value={rightsFilter}
                  onChange={(e) => setRightsFilter(e.target.value)}
                  disabled={!hasSelection}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={showClosedHabs}
                  onChange={(e) => setShowClosedHabs(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                Afficher l'historique
              </label>
            </div>

            {!hasSelection ? (
              <div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>Agence</TableHead>
                      <TableHead>Application</TableHead>
                      <TableHead>Profil</TableHead>
                      <TableHead>D. Début</TableHead>
                      <TableHead>D. Fin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody />
                </Table>
              </div>
            ) : habLoading ? (
              <p className="text-sm text-muted-foreground">Chargement des habilitations…</p>
            ) : filteredHabs.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                Aucune habilitation trouvée.
              </p>
            ) : (
              <>
              <div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>Agence</TableHead>
                      <TableHead>Application</TableHead>
                      <TableHead>Profil</TableHead>
                      <TableHead>D. Début</TableHead>
                      <TableHead>D. Fin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {habsPageData.map((h) => (
                      <TableRow
                        key={h.accId}
                        className={h.dateFin ? "opacity-50" : ""}
                      >
                        <TableCell>{h.nomDelegation ?? "—"}</TableCell>
                        <TableCell>{h.nomApplication ?? "—"}</TableCell>
                        <TableCell>{h.nomProfil}</TableCell>
                        <TableCell>{formatDate(h.dateDebut)}</TableCell>
                        <TableCell>
                          {h.dateFin ? (
                            <span className="text-xs text-muted-foreground">{formatDate(h.dateFin)}</span>
                          ) : (
                            <span className="text-xs font-medium text-success">Ouvert</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {habsTotalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {(habsPage - 1) * HABS_PER_PAGE + 1}–{Math.min(habsPage * HABS_PER_PAGE, filteredHabs.length)} sur {filteredHabs.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHabsPage((p) => Math.max(1, p - 1))}
                      disabled={habsPage === 1}
                    >
                      ‹ Précédent
                    </Button>
                    <span className="px-2">
                      Page {habsPage} / {habsTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHabsPage((p) => Math.min(habsTotalPages, p + 1))}
                      disabled={habsPage === habsTotalPages}
                    >
                      Suivant ›
                    </Button>
                  </div>
                </div>
              )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {/* Dialog historique */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historique des affectations</DialogTitle>
            <DialogDescription>
              Mouvements d'agence enregistrés pour {selectedAgent?.nomComplet}.
            </DialogDescription>
          </DialogHeader>
          {historique.length === 0 ? (
            <EmptyState
              title="Aucun mouvement enregistré"
              description="Aucune affectation historisée pour cet agent."
            />
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Agence</TableHead>
                    <TableHead>Date début</TableHead>
                    <TableHead>Date fin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historique.map((h, i) => (
                    <TableRow key={i}>
                      <TableCell>{h.nomDelegation}</TableCell>
                      <TableCell>{formatDate(h.dateDebut)}</TableCell>
                      <TableCell>
                        {h.dateFin ? (
                          formatDate(h.dateFin)
                        ) : (
                          <span className="text-xs font-medium text-success">Actuelle</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
