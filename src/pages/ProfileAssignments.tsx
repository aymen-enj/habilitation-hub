import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  CheckCircle2,
  FileSpreadsheet,
  ShieldOff,
  Trash2,
  Upload,
  Users,
  BadgeCheck,
  Layers3,
} from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "@/state/DemoState";
import { PageHeader } from "@/components/cnss/PageHeader";
import { FormField } from "@/components/cnss/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const todayInput = () => new Date().toISOString().slice(0, 10);
const inDaysInput = (days: number) => {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
};
const toInputDate = (value: string) => value.slice(0, 10);

const normalizeAction = (value: string): "ASSIGN" | "SUSPEND" | null => {
  const normalized = value.trim().toUpperCase();
  if (["ASSIGN", "ATTRIBUER", "AFFECTER", "DONNER"].includes(normalized)) return "ASSIGN";
  if (["SUSPEND", "SUSPENDRE", "FERMER"].includes(normalized)) return "SUSPEND";
  return null;
};

const parseDate = (value: unknown): string | undefined => {
  if (!value && value !== 0) return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.toISOString();

  const raw = String(value).trim();
  if (!raw) return undefined;

  const match = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const date = new Date(`${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

interface ParsedBulkRow {
  rowIndex: number;
  matricule: string;
  action: "ASSIGN" | "SUSPEND" | null;
  applicationName: string;
  profileName: string;
  startRaw: string;
  endRaw: string;
  agentId?: string;
  agentFullName?: string;
  applicationId?: string;
  profileId?: string;
  startIso?: string;
  endIso?: string;
  errors: string[];
}

export default function ProfileAssignments() {
  const {
    agents,
    applications,
    profiles,
    modules,
    assignProfilesToAgent,
    suspendProfilesForAgent,
  } = useDemo();

  const [activeTab, setActiveTab] = useState<"assign" | "suspend" | "bulk">("assign");
  const [grantAgentSearch, setGrantAgentSearch] = useState("");
  const [grantAgentSuggestionsOpen, setGrantAgentSuggestionsOpen] = useState(false);
  const [grantApplicationId, setGrantApplicationId] = useState("");
  const [grantProfileId, setGrantProfileId] = useState("");
  const [grantStartDate, setGrantStartDate] = useState(todayInput());
  const [grantEndDate, setGrantEndDate] = useState(inDaysInput(365));

  const [suspendAgentSearch, setSuspendAgentSearch] = useState("");
  const [suspendAgentSuggestionsOpen, setSuspendAgentSuggestionsOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<null | {
    profileId: string;
    profileName: string;
    applicationName: string;
  }>(null);
  const [suspendStartDate, setSuspendStartDate] = useState(todayInput());
  const [suspendEndDate, setSuspendEndDate] = useState("");

  const [bulkRows, setBulkRows] = useState<ParsedBulkRow[]>([]);
  const [bulkFileName, setBulkFileName] = useState<string | null>(null);
  const [bulkDragging, setBulkDragging] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<"assign" | "suspend">("assign");
  const bulkFileRef = useRef<HTMLInputElement>(null);

  const agentsById = useMemo(
    () => new Map(agents.map((agent) => [agent.id.toLowerCase(), agent])),
    [agents],
  );

  const agentsByMatricule = useMemo(
    () => new Map(agents.map((agent) => [agent.matricule.toLowerCase(), agent])),
    [agents],
  );

  const selectedGrantAgent =
    agentsByMatricule.get(grantAgentSearch.trim().toLowerCase()) ??
    agentsById.get(grantAgentSearch.trim().toLowerCase()) ??
    null;
  const selectedSuspendAgent =
    agentsByMatricule.get(suspendAgentSearch.trim().toLowerCase()) ??
    agentsById.get(suspendAgentSearch.trim().toLowerCase()) ??
    null;

  const grantAgentMatches = useMemo(() => {
    const query = grantAgentSearch.trim().toLowerCase();
    if (!query) return [];
    return agents
      .filter((agent) => {
        const fullName = `${agent.firstName} ${agent.lastName}`.toLowerCase();
        return (
          fullName.includes(query) ||
          agent.matricule.toLowerCase().includes(query) ||
          agent.id.toLowerCase().includes(query)
        );
      })
      .slice(0, 12);
  }, [agents, grantAgentSearch]);

  const suspendAgentMatches = useMemo(() => {
    const query = suspendAgentSearch.trim().toLowerCase();
    if (!query) return [];
    return agents
      .filter((agent) => {
        const fullName = `${agent.firstName} ${agent.lastName}`.toLowerCase();
        return (
          fullName.includes(query) ||
          agent.matricule.toLowerCase().includes(query) ||
          agent.id.toLowerCase().includes(query)
        );
      })
      .slice(0, 12);
  }, [agents, suspendAgentSearch]);

  const grantProfiles = useMemo(() => {
    if (!grantApplicationId) return [];
    return profiles.filter((profile) => profile.applicationId === grantApplicationId);
  }, [grantApplicationId, profiles]);

  const applicationsById = useMemo(
    () => new Map(applications.map((application) => [application.id, application])),
    [applications],
  );
  const profilesById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles],
  );

  const suspendRows = useMemo(() => {
    if (!selectedSuspendAgent) return [];

    const grouped = new Map<
      string,
      {
        profileId: string;
        applicationName: string;
        profileName: string;
        startDate: string;
        endDate: string;
      }
    >();

    selectedSuspendAgent.habilitations
      .filter((habilitation) => new Date(habilitation.endDate) > new Date())
      .forEach((habilitation) => {
        const profile = profilesById.get(habilitation.profileId);
        if (!profile) return;
        const application = applicationsById.get(habilitation.applicationId);
        const key = `${habilitation.applicationId}-${habilitation.profileId}`;
        const current = grouped.get(key);

        if (!current) {
          grouped.set(key, {
            profileId: profile.id,
            applicationName: application?.name ?? habilitation.applicationId,
            profileName: profile.name,
            startDate: habilitation.startDate,
            endDate: habilitation.endDate,
          });
          return;
        }

        grouped.set(key, {
          ...current,
          startDate: new Date(habilitation.startDate) < new Date(current.startDate) ? habilitation.startDate : current.startDate,
          endDate: new Date(habilitation.endDate) > new Date(current.endDate) ? habilitation.endDate : current.endDate,
        });
      });

    return Array.from(grouped.values()).sort((a, b) =>
      `${a.applicationName}-${a.profileName}`.localeCompare(`${b.applicationName}-${b.profileName}`),
    );
  }, [applicationsById, profilesById, selectedSuspendAgent]);

  const bulkValidRows = bulkRows.filter((row) => row.errors.length === 0);
  const bulkAssignRows = bulkRows.filter((row) => row.action === "ASSIGN");
  const bulkSuspendRows = bulkRows.filter((row) => row.action === "SUSPEND");
  const bulkCategoryRows = bulkCategory === "assign" ? bulkAssignRows : bulkSuspendRows;
  const bulkCategoryValidRows = bulkCategoryRows.filter((row) => row.errors.length === 0);
  const bulkCategoryInvalidRows = bulkCategoryRows.filter((row) => row.errors.length > 0);

  const suspendAgentRightsCount = suspendRows.length;

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Matricule", "Action", "Application", "Profil", "Date_Debut", "Date_Fin"],
      ["CNSS-10421", "ASSIGN", "SIRH", "Gestionnaire RH", "01/05/2026", "31/12/2026"],
      ["CNSS-11102", "SUSPEND", "ComptabilitÃ© GÃ©nÃ©rale", "Comptable", "", ""],
    ]);

    ws["!cols"] = [14, 14, 26, 22, 14, 14].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Affectations profils");
    XLSX.writeFile(wb, "modele_affectations_profils.xlsx");
  };

  const handleGrant = () => {
    if (!grantAgentSearch.trim()) {
      toast.error("Saisissez d'abord le matricule de l'agent.");
      return;
    }
    if (!selectedGrantAgent) {
      toast.error(`Aucun agent trouve pour "${grantAgentSearch.trim()}".`);
      return;
    }
    if (!grantProfileId) {
      toast.error("Choisissez un profil.");
      return;
    }
    if (!grantStartDate || !grantEndDate) {
      toast.error("Les dates de dÃ©but et de fin sont requises.");
      return;
    }
    if (new Date(grantEndDate) <= new Date(grantStartDate)) {
      toast.error("La date de fin doit Ãªtre aprÃ¨s la date de dÃ©but.");
      return;
    }

    assignProfilesToAgent(selectedGrantAgent.id, [grantProfileId], grantStartDate, grantEndDate);
    toast.success(`Profil(s) attribuÃ©(s) Ã  ${selectedGrantAgent?.firstName} ${selectedGrantAgent?.lastName}.`);
    setGrantProfileId("");
    setGrantApplicationId("");
    setGrantStartDate(todayInput());
    setGrantEndDate(inDaysInput(365));
  };

  const openSuspendForm = (row: { profileId: string; profileName: string; applicationName: string }) => {
    if (!selectedSuspendAgent) {
      toast.error("Saisissez d'abord le matricule de l'agent.");
      return;
    }
    setSuspendTarget(row);
    setSuspendStartDate(todayInput());
    setSuspendEndDate("");
    setSuspendDialogOpen(true);
  };

  const handleSuspend = () => {
    if (!suspendAgentSearch.trim()) {
      toast.error("Saisissez d'abord le matricule de l'agent.");
      return;
    }
    if (!selectedSuspendAgent) {
      toast.error(`Aucun agent trouve pour "${suspendAgentSearch.trim()}".`);
      return;
    }
    if (!suspendTarget) {
      toast.error("Choisissez un profil a suspendre.");
      return;
    }
    if (!suspendStartDate) {
      toast.error("La date de debut est requise.");
      return;
    }
    if (suspendEndDate && new Date(suspendEndDate) <= new Date(suspendStartDate)) {
      toast.error("La date de fin doit etre apres la date de debut.");
      return;
    }

    suspendProfilesForAgent(
      selectedSuspendAgent.id,
      [suspendTarget.profileId],
      suspendStartDate,
      suspendEndDate || undefined,
    );
    toast.success(`Profil "${suspendTarget.profileName}" suspendu pour ${selectedSuspendAgent.firstName} ${selectedSuspendAgent.lastName}.`);
    setSuspendDialogOpen(false);
    setSuspendTarget(null);
    setSuspendStartDate(todayInput());
    setSuspendEndDate("");
  };
  const processBulkFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const workbook = XLSX.read(event.target?.result as ArrayBuffer, { type: "array", cellDates: true });
      const rawRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[workbook.SheetNames[0]], {
        header: 1,
        defval: "",
      });

      const dataRows = rawRows.slice(1).filter((row) =>
        (row as unknown[]).some((cell) => cell !== "" && cell !== null && cell !== undefined),
      );

      const parsed = dataRows.map((row, index) => {
        const [c0, c1, c2, c3, c4, c5] = row as unknown[];
        const matricule = String(c0 ?? "").trim();
        const actionRaw = String(c1 ?? "").trim();
        const applicationName = String(c2 ?? "").trim();
        const profileName = String(c3 ?? "").trim();
        const startRaw = String(c4 ?? "").trim();
        const endRaw = String(c5 ?? "").trim();
        const errors: string[] = [];

        const action = normalizeAction(actionRaw);
        const agent = agents.find((candidate) => candidate.matricule === matricule);
        if (!matricule) errors.push("Matricule requis");
        else if (!agent) errors.push(`Agent "${matricule}" introuvable`);

        if (!action) errors.push(`Action invalide : "${actionRaw}"`);

        const application = applications.find(
          (candidate) =>
            candidate.name.toLowerCase() === applicationName.toLowerCase() ||
            candidate.code.toLowerCase() === applicationName.toLowerCase() ||
            candidate.abbreviation.toLowerCase() === applicationName.toLowerCase(),
        );
        if (!applicationName) errors.push("Application requise");
        else if (!application) errors.push(`Application "${applicationName}" introuvable`);

        if (agent && application && agent.domain !== application.domain) {
          errors.push(`Domaine incompatible : agent=${agent.domain}, app=${application.domain}`);
        }

        const profile = application
          ? profiles.find(
              (candidate) =>
                candidate.applicationId === application.id &&
                (candidate.name.toLowerCase() === profileName.toLowerCase() ||
                  candidate.code.toLowerCase() === profileName.toLowerCase() ||
                  candidate.abbreviation.toLowerCase() === profileName.toLowerCase()),
            )
          : undefined;
        if (!profileName) errors.push("Profil requis");
        else if (application && !profile) errors.push(`Profil "${profileName}" introuvable pour ${application.name}`);

        const startIso = parseDate(c4);
        const endIso = parseDate(c5);
        if (action === "ASSIGN") {
          if (!startRaw && !(c4 instanceof Date)) errors.push("Date de dÃ©but requise");
          else if (!startIso) errors.push(`Date de dÃ©but invalide : "${startRaw}"`);
          if (!endRaw && !(c5 instanceof Date)) errors.push("Date de fin requise");
          else if (!endIso) errors.push(`Date de fin invalide : "${endRaw}"`);
          if (startIso && endIso && endIso <= startIso) {
            errors.push("La date de fin doit Ãªtre aprÃ¨s la date de dÃ©but");
          }
        }

        return {
          rowIndex: index + 2,
          matricule,
          action,
          applicationName,
          profileName,
          startRaw,
          endRaw,
          agentId: agent?.id,
          agentFullName: agent ? `${agent.firstName} ${agent.lastName}` : undefined,
          applicationId: application?.id,
          profileId: profile?.id,
          startIso,
          endIso,
          errors,
        };
      });

      setBulkRows(parsed);
      setBulkFileName(file.name);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleBulkFile = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Format non supportÃ©. Utilisez .xlsx, .xls ou .csv");
      return;
    }
    processBulkFile(file);
  };

  const handleBulkApply = (category: "assign" | "suspend") => {
    if (!bulkFileName) return;

    const targetRows = bulkValidRows.filter((row) =>
      category === "assign" ? row.action === "ASSIGN" : row.action === "SUSPEND",
    );
    if (targetRows.length === 0) return;

    let appliedCount = 0;

    targetRows.forEach((row) => {
      if (!row.agentId || !row.profileId) return;

      if (category === "assign") {
        assignProfilesToAgent(row.agentId, [row.profileId], row.startIso ?? todayInput(), row.endIso ?? inDaysInput(365));
      } else {
        suspendProfilesForAgent(row.agentId, [row.profileId], row.startIso ?? todayInput(), row.endIso);
      }
      appliedCount += 1;
    });

    toast.success(
      `Fichier "${bulkFileName}" appliqué : ${appliedCount} ${category === "assign" ? "attribution(s)" : "suspension(s)"}.`,
    );
    setBulkRows([]);
    setBulkFileName(null);
    if (bulkFileRef.current) bulkFileRef.current.value = "";
  };

  return (
    <div className="cnss-page space-y-6">
      <PageHeader
        title="Affectations des profils"
        subtitle="Attribuez ou suspendez des profils directement, sans demander le module, puis importez des traitements en lot via Excel."
        actions={
          <Badge variant="outline" className="gap-1.5 border-cnss-accent/40 bg-cnss-accent-soft text-cnss-primary">
            <BadgeCheck className="h-3.5 w-3.5" />
            Action directe
          </Badge>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="cnss-card p-4">
          <p className="text-sm text-muted-foreground">Profils ouverts</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold text-foreground">{profiles.length}</p>
              <p className="text-xs text-muted-foreground">profils prÃ©definis</p>
            </div>
            <Layers3 className="h-8 w-8 text-cnss-primary" />
          </div>
        </div>
        <div className="cnss-card p-4">
          <p className="text-sm text-muted-foreground">Agents actifs</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold text-foreground">{agents.filter((agent) => agent.status === "ACTIF").length}</p>
              <p className="text-xs text-muted-foreground">dossier courant</p>
            </div>
            <Users className="h-8 w-8 text-success" />
          </div>
        </div>
        <div className="cnss-card p-4">
          <p className="text-sm text-muted-foreground">Modules associÃ©s</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold text-foreground">{modules.length}</p>
              <p className="text-xs text-muted-foreground">fermÃ©s par profil</p>
            </div>
            <FileSpreadsheet className="h-8 w-8 text-warning" />
          </div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-muted/60">
          <TabsTrigger value="assign">Attribuer</TabsTrigger>
          <TabsTrigger value="suspend">Suspendre</TabsTrigger>
          <TabsTrigger value="bulk">En lot</TabsTrigger>
        </TabsList>

        <TabsContent value="assign" className="space-y-4">
          <section className="cnss-card space-y-5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cnss-accent-soft text-cnss-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Attribuer un nouveau profil</h2>
                <p className="text-sm text-muted-foreground">Selectionnez l'agent puis renseignez la ligne d'attribution dans le tableau.</p>
              </div>
            </div>

            <div className="grid gap-4">
              <FormField id="grant-agent" label="Agent" required>
                <div className="relative space-y-2">
                  <Input
                    id="grant-agent"
                    value={grantAgentSearch}
                    onChange={(event) => {
                      setGrantAgentSearch(event.target.value);
                      setGrantAgentSuggestionsOpen(true);
                    }}
                    onFocus={() => setGrantAgentSuggestionsOpen(true)}
                    onBlur={() => setGrantAgentSuggestionsOpen(false)}
                    placeholder="Rechercher par nom ou matricule (ex: CNSS-10421)"
                    autoComplete="off"
                  />
                  {grantAgentSuggestionsOpen && grantAgentSearch.trim() && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
                      {grantAgentMatches.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">Aucun agent conforme a cette recherche.</p>
                      ) : (
                        grantAgentMatches.map((agent) => (
                          <button
                            key={agent.id}
                            type="button"
                            className="w-full rounded-sm px-3 py-2 text-left hover:bg-muted/60"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              setGrantAgentSearch(agent.matricule);
                              setGrantAgentSuggestionsOpen(false);
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
                    {selectedGrantAgent
                      ? `${selectedGrantAgent.firstName} ${selectedGrantAgent.lastName} - ${selectedGrantAgent.matricule}`
                      : "Saisissez un nom ou un matricule pour charger l'agent."}
                  </p>
                </div>
              </FormField>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Application</TableHead>
                    <TableHead>Profil</TableHead>
                    <TableHead>D Debut</TableHead>
                    <TableHead>D Fin</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="min-w-[220px]">
                      <Select
                        value={grantApplicationId}
                        onValueChange={(value) => {
                          setGrantApplicationId(value);
                          setGrantProfileId("");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir une application" />
                        </SelectTrigger>
                        <SelectContent>
                          {applications.map((application) => (
                            <SelectItem key={application.id} value={application.id}>
                              {application.code} - {application.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="min-w-[220px]">
                      <Select
                        value={grantProfileId}
                        onValueChange={setGrantProfileId}
                        disabled={!grantApplicationId || grantProfiles.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={grantApplicationId ? "Choisir un profil" : "Selectionnez d'abord l'application"} />
                        </SelectTrigger>
                        <SelectContent>
                          {grantProfiles.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.code} - {profile.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="min-w-[150px]">
                      <Input type="date" value={grantStartDate} onChange={(event) => setGrantStartDate(event.target.value)} />
                    </TableCell>
                    <TableCell className="min-w-[150px]">
                      <Input type="date" value={grantEndDate} onChange={(event) => setGrantEndDate(event.target.value)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        onClick={handleGrant}
                        disabled={!selectedGrantAgent || !grantApplicationId || !grantProfileId}
                      >
                        Attribuer
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setGrantAgentSearch("");
                  setGrantAgentSuggestionsOpen(false);
                  setGrantApplicationId("");
                  setGrantProfileId("");
                  setGrantStartDate(todayInput());
                  setGrantEndDate(inDaysInput(365));
                }}
              >
                Reinitialiser
              </Button>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="suspend" className="space-y-4">
          <section className="cnss-card space-y-5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-warning-soft text-warning">
                <ShieldOff className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Suspendre un profil</h2>
                <p className="text-sm text-muted-foreground">Selectionnez les profils a suspendre puis renseignez les dates de suspension.</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <FormField id="suspend-agent" label="Agent" required>
                <div className="relative space-y-2">
                  <Input
                    id="suspend-agent"
                    value={suspendAgentSearch}
                    onChange={(event) => {
                      setSuspendAgentSearch(event.target.value);
                      setSuspendAgentSuggestionsOpen(true);
                      setSuspendTarget(null);
                      setSuspendDialogOpen(false);
                    }}
                    onFocus={() => setSuspendAgentSuggestionsOpen(true)}
                    onBlur={() => setSuspendAgentSuggestionsOpen(false)}
                    placeholder="Rechercher par nom ou matricule (ex: CNSS-10421)"
                    autoComplete="off"
                  />
                  {suspendAgentSuggestionsOpen && suspendAgentSearch.trim() && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
                      {suspendAgentMatches.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">Aucun agent conforme a cette recherche.</p>
                      ) : (
                        suspendAgentMatches.map((agent) => (
                          <button
                            key={agent.id}
                            type="button"
                            className="w-full rounded-sm px-3 py-2 text-left hover:bg-muted/60"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              setSuspendAgentSearch(agent.matricule);
                              setSuspendTarget(null);
                              setSuspendDialogOpen(false);
                              setSuspendAgentSuggestionsOpen(false);
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
                    {selectedSuspendAgent
                      ? `${selectedSuspendAgent.firstName} ${selectedSuspendAgent.lastName} - ${selectedSuspendAgent.matricule}`
                      : "Saisissez un nom ou un matricule pour charger l'agent."}
                  </p>
                </div>
              </FormField>

              <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                {selectedSuspendAgent ? (
                  <>
                    <p className="font-medium text-foreground">{selectedSuspendAgent.firstName} {selectedSuspendAgent.lastName}</p>
                    <p className="mt-1">{suspendAgentRightsCount} profil(s) actifs actuellement.</p>
                  </>
                ) : (
                  <p>Saisissez le nom ou le matricule d'un agent pour afficher ses profils actifs.</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Profils attribues a cet agent</p>
              {!selectedSuspendAgent ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
                  Aucun agent selectionne.
                </div>
              ) : suspendRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
                  Aucun profil actif a suspendre pour cet agent.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead>Application</TableHead>
                        <TableHead>Profil</TableHead>
                        <TableHead>D Debut</TableHead>
                        <TableHead>D Fin</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suspendRows.map((row) => {
                        return (
                          <TableRow key={`${row.applicationName}-${row.profileId}`}>
                            <TableCell>{row.applicationName}</TableCell>
                            <TableCell>{row.profileName}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{toInputDate(row.startDate)}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{toInputDate(row.endDate)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => openSuspendForm(row)}
                              >
                                Suspendre
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSuspendAgentSearch("");
                  setSuspendAgentSuggestionsOpen(false);
                  setSuspendTarget(null);
                  setSuspendDialogOpen(false);
                  setSuspendStartDate(todayInput());
                  setSuspendEndDate("");
                }}
              >
                Reinitialiser
              </Button>
            </div>
          </section>
        </TabsContent>
        <TabsContent value="bulk" className="space-y-4">
          <section className="space-y-5 cnss-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cnss-accent-soft text-cnss-primary">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Traitement en lot</h2>
                <p className="text-sm text-muted-foreground">Chargez un fichier Excel puis appliquez par categorie: attribution ou suspension.</p>
              </div>
            </div>

            <Tabs value={bulkCategory} onValueChange={(value) => setBulkCategory(value as "assign" | "suspend")} className="space-y-4">
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-muted/60">
                <TabsTrigger value="assign">Attribution</TabsTrigger>
                <TabsTrigger value="suspend">Suspension</TabsTrigger>
              </TabsList>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Le fichier doit contenir: Matricule, Action, Application, Profil, Date_Debut, Date_Fin.</p>
                <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Télécharger le modèle
                </Button>
              </div>

              <div
                className={cn(
                  "relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors",
                  bulkDragging
                    ? "border-cnss-accent bg-cnss-accent-soft"
                    : "border-border bg-muted/20 hover:border-cnss-accent/60 hover:bg-muted/40",
                )}
                onDragOver={(event) => {
                  event.preventDefault();
                  setBulkDragging(true);
                }}
                onDragLeave={() => setBulkDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setBulkDragging(false);
                  const file = event.dataTransfer.files[0];
                  if (file) handleBulkFile(file);
                }}
                onClick={() => bulkFileRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => event.key === "Enter" && bulkFileRef.current?.click()}
                aria-label="Zone de dépôt Excel"
              >
                <input
                  ref={bulkFileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="sr-only"
                  onChange={(event) => event.target.files?.[0] && handleBulkFile(event.target.files[0])}
                />

                {bulkFileName ? (
                  <>
                    <FileSpreadsheet className="h-10 w-10 text-cnss-primary" />
                    <p className="text-sm font-medium text-foreground">{bulkFileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {bulkRows.length} ligne(s) détectée(s) — {bulkCategoryRows.length} dans cet onglet
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-danger"
                      onClick={(event) => {
                        event.stopPropagation();
                        setBulkRows([]);
                        setBulkFileName(null);
                        if (bulkFileRef.current) bulkFileRef.current.value = "";
                      }}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Supprimer
                    </Button>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Glissez un fichier ici ou cliquez pour parcourir</p>
                    <p className="text-xs text-muted-foreground">.xlsx · .xls · .csv</p>
                  </>
                )}
              </div>

              {bulkRows.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    {bulkCategoryRows.length} ligne(s) {bulkCategory === "assign" ? "attribution" : "suspension"}
                  </Badge>
                  {bulkCategoryValidRows.length > 0 && (
                    <Badge variant="secondary" className="gap-1.5 bg-success-soft text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {bulkCategoryValidRows.length} valide(s)
                    </Badge>
                  )}
                  {bulkCategoryInvalidRows.length > 0 && (
                    <Badge variant="secondary" className="gap-1.5 bg-danger-soft text-danger">
                      <ShieldOff className="h-3.5 w-3.5" />
                      {bulkCategoryInvalidRows.length} erreur(s)
                    </Badge>
                  )}
                </div>
              )}

              {bulkRows.length > 0 && bulkCategoryRows.length === 0 && (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
                  Aucune ligne "{bulkCategory === "assign" ? "ASSIGN" : "SUSPEND"}" dans ce fichier pour cet onglet.
                </div>
              )}

              {bulkCategoryRows.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Application</TableHead>
                        <TableHead>Profil</TableHead>
                        <TableHead>Début</TableHead>
                        <TableHead>Fin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkCategoryRows.map((row) => {
                        const valid = row.errors.length === 0;
                        return (
                          <TableRow key={row.rowIndex} className={cn(valid ? "hover:bg-success-soft/20" : "bg-danger-soft/10 hover:bg-danger-soft/20") }>
                            <TableCell className="font-mono text-xs text-muted-foreground">{row.rowIndex}</TableCell>
                            <TableCell>
                              {valid ? (
                                <CheckCircle2 className="h-4 w-4 text-success" />
                              ) : (
                                <div className="group relative">
                                  <ShieldOff className="h-4 w-4 cursor-help text-danger" />
                                  <div className="pointer-events-none absolute left-6 top-0 z-50 hidden w-72 rounded-lg border border-border bg-popover p-2 shadow-lg group-hover:block">
                                    <ul className="space-y-0.5">
                                      {row.errors.map((error, index) => (
                                        <li key={index} className="text-xs text-danger">· {error}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">{row.agentFullName ?? row.matricule}</TableCell>
                            <TableCell className="text-sm">{row.applicationName || "—"}</TableCell>
                            <TableCell className="text-sm">{row.profileName || "—"}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{row.startRaw || "—"}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{row.endRaw || "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-5 py-4">
                <p className="text-sm text-muted-foreground">Seules les lignes valides de cet onglet seront appliquées.</p>
                <div className="flex items-center gap-2">
                  <Button type="button" onClick={() => handleBulkApply(bulkCategory)} disabled={bulkCategoryValidRows.length === 0}>
                    Appliquer {bulkCategory === "assign" ? "les attributions" : "les suspensions"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setBulkRows([]);
                      setBulkFileName(null);
                      if (bulkFileRef.current) bulkFileRef.current.value = "";
                    }}
                  >
                    Réinitialiser
                  </Button>
                </div>
              </div>
            </Tabs>
          </section>
        </TabsContent>
      </Tabs>

      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Suspendre un profil</DialogTitle>
            <DialogDescription>
              {suspendTarget
                ? `${suspendTarget.applicationName} - ${suspendTarget.profileName}`
                : "Selectionnez un profil a suspendre."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField id="suspend-start-date" label="Date de debut" required>
              <Input
                id="suspend-start-date"
                type="date"
                value={suspendStartDate}
                onChange={(event) => setSuspendStartDate(event.target.value)}
              />
            </FormField>
            <FormField id="suspend-end-date" label="Date de fin (optionnelle)">
              <Input
                id="suspend-end-date"
                type="date"
                value={suspendEndDate}
                onChange={(event) => setSuspendEndDate(event.target.value)}
              />
            </FormField>
            <p className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
              Note: pour une suspension totale, laissez la date de fin vide. Pour une suspension sur une duree precise, renseignez la date de fin.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSuspendDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="button" variant="destructive" onClick={handleSuspend}>
                Valider la suspension
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}





