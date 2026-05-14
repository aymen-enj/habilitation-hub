import { useMemo, useState } from "react";
import { Calendar, Filter, RefreshCw, Search } from "lucide-react";
import { useDemo } from "@/state/DemoState";
import { PageHeader } from "@/components/cnss/PageHeader";
import { AlertBanner } from "@/components/cnss/AlertBanner";
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

type SortBy = "agent" | "agency" | "application" | "date";

export default function Requests() {
  const { agents, delegations, applications, profiles } = useDemo();
  const [sortBy, setSortBy] = useState<SortBy>("agent");
  const [selectedAgency, setSelectedAgency] = useState<string>("");
  const [selectedApplication, setSelectedApplication] = useState<string>("");
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isFiltered, setIsFiltered] = useState(false);

  // Build habilitations list from agents
  const allHabilitations = useMemo(() => {
    return agents.flatMap((agent) =>
      agent.habilitations.map((hab) => ({
        id: hab.id,
        agentId: agent.id,
        agentName: `${agent.firstName} ${agent.lastName}`,
        agencyId: agent.delegationId,
        agencyName:
          delegations.find((d) => d.id === agent.delegationId)?.name ||
          agent.delegationId,
        applicationId: hab.applicationId,
        applicationName:
          applications.find((a) => a.id === hab.applicationId)?.name ||
          hab.applicationId,
        profileId: hab.profileId,
        profileName:
          profiles.find((p) => p.id === hab.profileId)?.name || hab.profileId,
        startDate: hab.startDate,
        endDate: hab.endDate,
      }))
    );
  }, [agents, delegations, applications, profiles]);

  // Apply filters
  const filteredHabilitations = useMemo(() => {
    let result = allHabilitations;

    if (selectedAgency) {
      result = result.filter((h) => h.agencyId === selectedAgency);
    }
    if (selectedApplication) {
      result = result.filter((h) => h.applicationId === selectedApplication);
    }
    if (selectedProfile) {
      result = result.filter((h) => h.profileId === selectedProfile);
    }
    if (startDate) {
      result = result.filter((h) => new Date(h.startDate) >= new Date(startDate));
    }
    if (endDate) {
      result = result.filter((h) => new Date(h.endDate) <= new Date(endDate));
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "agent":
          return a.agentName.localeCompare(b.agentName);
        case "agency":
          return a.agencyName.localeCompare(b.agencyName);
        case "application":
          return a.applicationName.localeCompare(b.applicationName);
        case "date":
          return (
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          );
        default:
          return 0;
      }
    });

    return result;
  }, [allHabilitations, selectedAgency, selectedApplication, selectedProfile, startDate, endDate, sortBy]);

  const handleExecute = () => {
    setIsFiltered(true);
  };

  const handleReset = () => {
    setSelectedAgency("");
    setSelectedApplication("");
    setSelectedProfile("");
    setStartDate("");
    setEndDate("");
    setIsFiltered(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  return (
    <div className="cnss-page space-y-6">
      <PageHeader
        title="Consultation"
        subtitle="Recherche et consultation des habilitations"
      />

      <AlertBanner tone="info" title="Périmètre actuel">
        Cette page permet de consulter les habilitations existantes avec des filtres avancés.
      </AlertBanner>

      {/* Filters Card */}
      <Card className="border-border/50 bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Critères de recherche</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {/* Agence */}
          <div className="space-y-2">
            <Label htmlFor="agency-select" className="text-sm font-medium">
              Agence/DR
            </Label>
            <Select value={selectedAgency} onValueChange={setSelectedAgency}>
              <SelectTrigger id="agency-select" className="h-9">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                {delegations.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Application */}
          <div className="space-y-2">
            <Label htmlFor="app-select" className="text-sm font-medium">
              Application
            </Label>
            <Select value={selectedApplication} onValueChange={setSelectedApplication}>
              <SelectTrigger id="app-select" className="h-9">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                {applications.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Profil */}
          <div className="space-y-2">
            <Label htmlFor="profile-select" className="text-sm font-medium">
              Profil
            </Label>
            <Select value={selectedProfile} onValueChange={setSelectedProfile}>
              <SelectTrigger id="profile-select" className="h-9">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Start */}
          <div className="space-y-2">
            <Label htmlFor="date-start" className="text-sm font-medium">
              Début
            </Label>
            <Input
              id="date-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Date End */}
          <div className="space-y-2">
            <Label htmlFor="date-end" className="text-sm font-medium">
              Fin
            </Label>
            <Input
              id="date-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Tri */}
          <div className="space-y-2">
            <Label htmlFor="sort-select" className="text-sm font-medium">
              Trier par
            </Label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger id="sort-select" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="agency">Agence</SelectItem>
                <SelectItem value="application">Application</SelectItem>
                <SelectItem value="date">Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          <Button onClick={handleExecute} className="gap-2 bg-cnss-accent hover:bg-cnss-accent/90">
            <Search className="h-4 w-4" />
            Exécuter
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Réinitialiser
          </Button>
        </div>
      </Card>

      {/* Results */}
      {isFiltered && (
        <div className="cnss-card overflow-hidden">
          <div className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">
                Résultats ({filteredHabilitations.length})
              </h3>
              <Badge variant="secondary" className="gap-1.5">
                <Calendar className="h-3 w-3" />
                {filteredHabilitations.length} habilitation(s)
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
                {filteredHabilitations.length > 0 ? (
                  filteredHabilitations.map((hab) => {
                    const isExpired = new Date(hab.endDate) < new Date();
                    const isUpcoming =
                      new Date(hab.startDate) > new Date() &&
                      new Date(hab.startDate) <
                        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                    return (
                      <TableRow key={hab.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {hab.agencyName}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {hab.agentName}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {hab.applicationName}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {hab.profileName}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {formatDate(hab.startDate)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {formatDate(hab.endDate)}
                        </TableCell>
                        <TableCell>
                          {isExpired ? (
                            <Badge variant="destructive" className="bg-red-500/90">
                              Expiré
                            </Badge>
                          ) : isUpcoming ? (
                            <Badge className="bg-blue-500/90">Prochain</Badge>
                          ) : (
                            <Badge className="bg-green-500/90">Actif</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-8"
                    >
                      Aucune habilitation ne correspond aux critères
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {!isFiltered && (
        <Card className="border-dashed border-border/50 bg-muted/20 p-8 text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-sm text-muted-foreground">
            Utilisez les filtres ci-dessus et cliquez sur "Exécuter" pour consulter les habilitations
          </p>
        </Card>
      )}
    </div>
  );
}
