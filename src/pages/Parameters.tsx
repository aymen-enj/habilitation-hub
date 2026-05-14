import { useMemo, useState } from "react";
import { Search, Settings2 } from "lucide-react";
import { useDemo } from "@/state/DemoState";
import { PageHeader } from "@/components/cnss/PageHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

type TabValue = "applications" | "profiles" | "modules";

export default function Parameters() {
  const { applications, profiles, modules } = useDemo();
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabValue>("applications");

  const normalizedQuery = query.trim().toLowerCase();

  const selectedApplication = useMemo(
    () => applications.find((app) => app.id === selectedApplicationId) ?? null,
    [applications, selectedApplicationId],
  );

  const filteredProfiles = useMemo(() => {
    if (!selectedApplicationId) return [];
    const base = profiles.filter((profile) => profile.applicationId === selectedApplicationId);
    if (!normalizedQuery) return base;
    return base.filter((profile) =>
      `${profile.code} ${profile.name} ${profile.abbreviation}`.toLowerCase().includes(normalizedQuery),
    );
  }, [normalizedQuery, profiles, selectedApplicationId]);

  const filteredModules = useMemo(() => {
    if (!selectedApplicationId) return [];
    const profileIds = new Set(
      profiles
        .filter((profile) => profile.applicationId === selectedApplicationId)
        .map((profile) => profile.id),
    );
    const base = modules.filter((module) => profileIds.has(module.profileId));
    if (!normalizedQuery) return base;
    return base.filter((module) =>
      `${module.code} ${module.name} ${module.abbreviation} ${module.physicalName}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [modules, normalizedQuery, profiles, selectedApplicationId]);

  const profileById = useMemo(() => {
    const index = new Map<string, (typeof profiles)[number]>();
    for (const profile of profiles) index.set(profile.id, profile);
    return index;
  }, [profiles]);

  const autorisationRows = useMemo(() => {
    return filteredModules.map((module) => {
      const profile = profileById.get(module.profileId);
      return {
        id: module.id,
        profileCode: profile?.code ?? module.profileId,
        profileName: profile?.name ?? module.profileId,
        procGestion: module.code,
        startDate: "--/--/----",
        endDate: "--/--/----",
        applicationCode: selectedApplication?.code ?? "-",
      };
    });
  }, [filteredModules, profileById, selectedApplication]);

  const resetSelection = () => {
    setSelectedApplicationId("");
    setQuery("");
    setActiveTab("applications");
  };

  return (
    <div className="cnss-page space-y-6">
      <PageHeader
        title="Paramétrage des référentiels"
        subtitle="Sélectionnez d'abord l'application, puis consultez ses profils et autorisations."
        actions={
          <Badge variant="outline" className="gap-1.5 border-cnss-accent/40 bg-cnss-accent-soft text-cnss-primary">
            <Settings2 className="h-3.5 w-3.5" />
            Mode démonstration
          </Badge>
        }
      />

      <section className="cnss-card overflow-hidden">
        <div className="space-y-5 border-b border-border p-4">
          <p className="text-sm font-medium text-foreground">Paramétrage des applications</p>

          <div className="grid gap-4 md:grid-cols-3">
            <FormField id="application" label="Application" required>
              <Select value={selectedApplicationId} onValueChange={setSelectedApplicationId}>
                <SelectTrigger id="application">
                  <SelectValue placeholder="Sélectionner une application" />
                </SelectTrigger>
                <SelectContent>
                  {applications.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.code} - {app.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField id="application-label" label="Libellé">
              <Input id="application-label" value={selectedApplication?.name ?? ""} readOnly />
            </FormField>

            <FormField id="application-abbreviation" label="Abréviation">
              <Input id="application-abbreviation" value={selectedApplication?.abbreviation ?? ""} readOnly />
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
                disabled={!selectedApplicationId}
              />
            </div>
            <Button type="button" variant="outline" onClick={resetSelection}>
              Réinitialiser
            </Button>
          </div>
        </div>

        <div className="p-4">
          {!selectedApplicationId ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
              Sélectionnez d'abord une application pour afficher ses profils et autorisations.
            </div>
          ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="space-y-4">
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-muted/60">
              <TabsTrigger value="applications">Proc. Gestion</TabsTrigger>
              <TabsTrigger value="profiles">Profils</TabsTrigger>
              <TabsTrigger value="modules">Autorisations Profil</TabsTrigger>
            </TabsList>

            {/* Tab 1: Proc. Gestion */}
            <TabsContent value="applications" className="space-y-3">
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
                    {filteredModules.length > 0 ? (
                      filteredModules.map((module) => {
                        const profile = profileById.get(module.profileId);
                        return (
                          <TableRow key={module.id}>
                            <TableCell className="font-mono text-xs text-foreground">{module.code}</TableCell>
                            <TableCell className="font-medium text-foreground">{module.name}</TableCell>
                            <TableCell className="text-xs text-foreground">{module.abbreviation}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{profile?.code ?? "-"}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{module.physicalName}</TableCell>
                            <TableCell className="text-xs text-foreground">{module.extension}</TableCell>
                            <TableCell className="text-xs text-foreground">{module.type}</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Aucune ligne Proc. Gestion pour cette application
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Tab 2: Profils */}
            <TabsContent value="profiles" className="space-y-3">
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
                    {filteredProfiles.length > 0 ? (
                      filteredProfiles.map((profile) => (
                        <TableRow key={profile.id}>
                          <TableCell className="font-mono text-xs text-foreground">{profile.code}</TableCell>
                          <TableCell className="font-medium text-foreground">{profile.name}</TableCell>
                          <TableCell className="text-xs text-foreground">{profile.abbreviation}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">--/--/----</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Aucun profil trouvé
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Tab 3: Autorisations Profil */}
            <TabsContent value="modules" className="space-y-3">
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
                    {autorisationRows.length > 0 ? (
                      autorisationRows.map((row) => {
                        return (
                          <TableRow key={row.id}>
                            <TableCell className="font-mono text-xs text-foreground">{row.profileCode}</TableCell>
                            <TableCell className="font-medium text-foreground">{row.profileName}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{row.procGestion}</TableCell>
                            <TableCell className="text-xs text-foreground">{row.startDate}</TableCell>
                            <TableCell className="text-xs text-foreground">{row.endDate}</TableCell>
                            <TableCell className="text-xs text-foreground">{row.applicationCode}</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Aucune autorisation profil trouvée
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
          )}
        </div>
      </section>
    </div>
  );
}