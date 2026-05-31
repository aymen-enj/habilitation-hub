import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/cnss/PageHeader";
import { Pagination } from "@/components/cnss/Pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/cnss/FormField";
import { formatDate } from "@/lib/format";

const PER_PAGE = 10;

const API = import.meta.env.VITE_API_URL;

// ── Types (miroir des DTOs Java) ──────────────────────────────────────────────

interface ApplicationDTO {
  code: number;
  nom: string;
  abreviation: string;
}

interface ProfilDTO {
  id: number;
  nom: string;
  abreviation: string;
  dateCreation: string | null;
}

interface ProcGestionDTO {
  codeApplication: number;
  codePge: number;
  libelle: string;
  abreviation: string | null;
  type: string;
  refProc: string | null;
  nomPhysique: string | null;
  extension: string | null;
}

interface AutorisationProfilDTO {
  numProfil: number;
  nomProfil: string;
  codePge: number;
  libellePge: string;
  codeApplication: number;
  dateDebut: string | null;
  dateFin: string | null;
}

type TabValue = "proc-gestion" | "profils" | "autorisations";

// ─────────────────────────────────────────────────────────────────────────────

export default function Parameters() {
  const [selectedAppCode, setSelectedAppCode] = useState<string>("");
  const [query, setQuery]                     = useState("");
  const [activeTab, setActiveTab]             = useState<TabValue>("proc-gestion");
  const [pgPage,  setPgPage]  = useState(1);
  const [prPage,  setPrPage]  = useState(1);
  const [autPage, setAutPage] = useState(1);

  const appCodeNum = selectedAppCode ? parseInt(selectedAppCode) : null;
  const normalizedQuery = query.trim().toLowerCase();

  // ── Requêtes API ─────────────────────────────────────────────────────────────

  const { data: applications = [] } = useQuery<ApplicationDTO[]>({
    queryKey: ["parametrage-applications"],
    queryFn: () => fetch(`${API}/parametrage/applications`).then((r) => r.json()),
  });

  const { data: procGestionList = [], isLoading: pgLoading } = useQuery<ProcGestionDTO[]>({
    queryKey: ["parametrage-proc-gestion", appCodeNum],
    queryFn: () => fetch(`${API}/parametrage/proc-gestion?appCode=${appCodeNum}`).then((r) => r.json()),
    enabled: !!appCodeNum,
  });

  const { data: profils = [], isLoading: profilsLoading } = useQuery<ProfilDTO[]>({
    queryKey: ["parametrage-profils", appCodeNum],
    queryFn: () => fetch(`${API}/parametrage/profils?appCode=${appCodeNum}`).then((r) => r.json()),
    enabled: !!appCodeNum,
  });

  const { data: autorisations = [], isLoading: autLoading } = useQuery<AutorisationProfilDTO[]>({
    queryKey: ["parametrage-autorisations", appCodeNum],
    queryFn: () => fetch(`${API}/parametrage/autorisations?appCode=${appCodeNum}`).then((r) => r.json()),
    enabled: !!appCodeNum,
  });

  // ── Application sélectionnée ──────────────────────────────────────────────

  const selectedApplication = useMemo(
    () => applications.find((a) => a.code === appCodeNum) ?? null,
    [applications, appCodeNum],
  );

  // ── Filtrage local par query ──────────────────────────────────────────────

  const filteredProcGestion = useMemo(() => {
    if (!normalizedQuery) return procGestionList;
    return procGestionList.filter((p) =>
      `${p.codePge} ${p.libelle} ${p.abreviation ?? ""} ${p.nomPhysique ?? ""}`.toLowerCase().includes(normalizedQuery),
    );
  }, [procGestionList, normalizedQuery]);

  const filteredProfils = useMemo(() => {
    if (!normalizedQuery) return profils;
    return profils.filter((p) =>
      `${p.id} ${p.nom} ${p.abreviation}`.toLowerCase().includes(normalizedQuery),
    );
  }, [profils, normalizedQuery]);

  const filteredAutorisations = useMemo(() => {
    if (!normalizedQuery) return autorisations;
    return autorisations.filter((a) =>
      `${a.numProfil} ${a.nomProfil} ${a.libellePge}`.toLowerCase().includes(normalizedQuery),
    );
  }, [autorisations, normalizedQuery]);

  // Revenir à la page 1 quand les données filtrées changent
  useEffect(() => { setPgPage(1);  }, [filteredProcGestion]);
  useEffect(() => { setPrPage(1);  }, [filteredProfils]);
  useEffect(() => { setAutPage(1); }, [filteredAutorisations]);

  // Données de la page courante pour chaque onglet
  const pgPageData  = filteredProcGestion.slice((pgPage  - 1) * PER_PAGE, pgPage  * PER_PAGE);
  const prPageData  = filteredProfils.slice(    (prPage  - 1) * PER_PAGE, prPage  * PER_PAGE);
  const autPageData = filteredAutorisations.slice((autPage - 1) * PER_PAGE, autPage * PER_PAGE);

  // ─────────────────────────────────────────────────────────────────────────

  const resetSelection = () => {
    setSelectedAppCode("");
    setQuery("");
    setActiveTab("proc-gestion");
  };

  return (
    <div className="cnss-page space-y-6">
      <PageHeader
        title="Paramétrage des référentiels"
        subtitle="Sélectionnez d'abord l'application, puis consultez ses profils et autorisations."
      />

      <section className="cnss-card overflow-hidden">
        <div className="space-y-5 border-b border-border p-4">
          <p className="text-sm font-medium text-foreground">Paramétrage des applications</p>

          <div className="grid gap-4 md:grid-cols-3">
            <FormField id="application" label="Application" required>
              <Select value={selectedAppCode} onValueChange={setSelectedAppCode}>
                <SelectTrigger id="application">
                  <SelectValue placeholder="Sélectionner une application" />
                </SelectTrigger>
                <SelectContent side="bottom" avoidCollisions={false} className="max-h-60 overflow-y-auto">
                  {applications.map((app) => (
                    <SelectItem key={app.code} value={String(app.code)}>
                      {app.code} - {app.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField id="application-label" label="Libellé">
              <Input id="application-label" value={selectedApplication?.nom ?? ""} readOnly />
            </FormField>

            <FormField id="application-abbreviation" label="Abréviation">
              <Input id="application-abbreviation" value={selectedApplication?.abreviation ?? ""} readOnly />
            </FormField>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                aria-label="Rechercher dans les lignes"
                placeholder="Rechercher un code, un libellé ou une abréviation…"
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={!selectedAppCode}
              />
            </div>
            <Button type="button" variant="outline" onClick={resetSelection}>
              Réinitialiser
            </Button>
          </div>
        </div>

        <div className="p-4">
          {!selectedAppCode ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
              Sélectionnez d'abord une application pour afficher ses procédures, profils et autorisations.
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="space-y-4">
              <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-muted/60">
                <TabsTrigger value="proc-gestion">Proc. Gestion</TabsTrigger>
                <TabsTrigger value="profils">Profils</TabsTrigger>
                <TabsTrigger value="autorisations">Autorisations Profil</TabsTrigger>
              </TabsList>

              {/* ── Onglet 1 : Proc. Gestion ── */}
              <TabsContent value="proc-gestion" className="space-y-3">
                {pgLoading ? (
                  <p className="text-sm text-muted-foreground">Chargement…</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="font-semibold">Code</TableHead>
                            <TableHead className="font-semibold">Libellé</TableHead>
                            <TableHead className="font-semibold">Abréviation</TableHead>
                            <TableHead className="font-semibold">Réf Proc</TableHead>
                            <TableHead className="font-semibold">Nom Phy</TableHead>
                            <TableHead className="font-semibold">.Ext</TableHead>
                            <TableHead className="font-semibold">Type</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pgPageData.length > 0 ? (
                            pgPageData.map((p) => (
                              <TableRow key={p.codePge}>
                                <TableCell className="font-mono text-xs text-foreground">{p.codePge}</TableCell>
                                <TableCell className="font-medium text-foreground">{p.libelle}</TableCell>
                                <TableCell className="text-xs text-foreground">{p.abreviation ?? "—"}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{p.refProc ?? "—"}</TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">{p.nomPhysique ?? "—"}</TableCell>
                                <TableCell className="text-xs text-foreground">{p.extension ?? "—"}</TableCell>
                                <TableCell className="text-xs text-foreground">{p.type}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                Aucune proc. de gestion pour cette application
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <Pagination
                      currentPage={pgPage}
                      totalPages={Math.max(1, Math.ceil(filteredProcGestion.length / PER_PAGE))}
                      totalItems={filteredProcGestion.length}
                      itemsPerPage={PER_PAGE}
                      onPageChange={setPgPage}
                    />
                  </>
                )}
              </TabsContent>

              {/* ── Onglet 2 : Profils ── */}
              <TabsContent value="profils" className="space-y-3">
                {profilsLoading ? (
                  <p className="text-sm text-muted-foreground">Chargement…</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableHead className="font-semibold">N°Profil</TableHead>
                          <TableHead className="font-semibold">Libellé</TableHead>
                          <TableHead className="font-semibold">Abréviation</TableHead>
                          <TableHead className="font-semibold">D Création</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {prPageData.length > 0 ? (
                          prPageData.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono text-xs text-foreground">{p.id}</TableCell>
                              <TableCell className="font-medium text-foreground">{p.nom}</TableCell>
                              <TableCell className="text-xs text-foreground">{p.abreviation}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {p.dateCreation ? formatDate(p.dateCreation) : "—"}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                              Aucun profil trouvé pour cette application
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    <Pagination
                      currentPage={prPage}
                      totalPages={Math.max(1, Math.ceil(filteredProfils.length / PER_PAGE))}
                      totalItems={filteredProfils.length}
                      itemsPerPage={PER_PAGE}
                      onPageChange={setPrPage}
                    />
                  </div>
                )}
              </TabsContent>

              {/* ── Onglet 3 : Autorisations Profil ── */}
              <TabsContent value="autorisations" className="space-y-3">
                {autLoading ? (
                  <p className="text-sm text-muted-foreground">Chargement…</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableHead className="font-semibold">N°Profil</TableHead>
                          <TableHead className="font-semibold">Lib Profil</TableHead>
                          <TableHead className="font-semibold">Proc Gestion</TableHead>
                          <TableHead className="font-semibold">D Début</TableHead>
                          <TableHead className="font-semibold">D Fin</TableHead>
                          <TableHead className="font-semibold">Application</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {autPageData.length > 0 ? (
                          autPageData.map((a, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-mono text-xs text-foreground">{a.numProfil}</TableCell>
                              <TableCell className="font-medium text-foreground">{a.nomProfil}</TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">{a.libellePge}</TableCell>
                              <TableCell className="text-xs text-foreground">
                                {a.dateDebut ? formatDate(a.dateDebut) : "—"}
                              </TableCell>
                              <TableCell className="text-xs text-foreground">
                                {a.dateFin ? formatDate(a.dateFin) : (
                                  <span className="text-xs font-medium text-success">Actif</span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-foreground">{a.codeApplication}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                              Aucune autorisation profil pour cette application
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    <Pagination
                      currentPage={autPage}
                      totalPages={Math.max(1, Math.ceil(filteredAutorisations.length / PER_PAGE))}
                      totalItems={filteredAutorisations.length}
                      itemsPerPage={PER_PAGE}
                      onPageChange={setAutPage}
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </section>
    </div>
  );
}
