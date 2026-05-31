import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Pagination } from "@/components/cnss/Pagination";
import { toast } from "sonner";
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

const API = import.meta.env.VITE_API_URL;
const PAGE_SIZE = 10;

// ── Types (API réelle) ─────────────────────────────────────────────────────────

interface AgentDTO {
  codeAgent: string;
  nomComplet: string;
  etat: string;
  poste: string;
  codeDelegation: string | null;
  nomDelegation: string | null;
}

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

interface HabilitationDTO {
  accId: number;
  nomProfil: string;
  nomDelegation: string;
  nomApplication: string | null;
  dateDebut: string;
  dateFin: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const todayInput = () => new Date().toISOString().slice(0, 10);
const inDaysInput = (days: number) => {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
};
const toInputDate = (value: string) => value.slice(0, 10);


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


interface ParsedAssignRow {
  rowIndex: number;
  matricule: string;
  codeApplication: number | null;
  codeProfil: number | null;
  dateDebut: string | null;
  dateFin: string | null;
  errors: string[];
  status?: "idle" | "success" | "error";
  backendError?: string;
}

interface ParsedSuspendRow {
  rowIndex: number;
  matricule: string;
  codeProfil: number | null;
  dateDebut: string | null;      // dateDebutSuspension
  dateFin: string | null;        // dateFinSuspension, null = définitive
  errors: string[];
  status?: "idle" | "success" | "error";
  backendError?: string;
}

// ──────────────────────────────────────────────────────────────────────────────

const parseIntCol = (val: unknown): number | null => {
  const n = Number(val);
  return !isNaN(n) && Number.isInteger(n) && n > 0 ? n : null;
};

const getLoginSaisie = (): string => {
  try {
    const stored = localStorage.getItem("cnss_agent");
    if (stored) {
      const parsed = JSON.parse(stored) as { codeAgent?: string };
      if (parsed.codeAgent) return parsed.codeAgent;
    }
  } catch {
    // ignore parse errors
  }
  return "SYSTEM";
};

export default function ProfileAssignments() {

  const [activeTab, setActiveTab] = useState<"assign" | "suspend" | "bulk">("assign");

  // ── Onglet Attribuer — état ─────────────────────────────────────────────────
  const [selectedGrantAgent, setSelectedGrantAgent] = useState<AgentDTO | null>(null);
  const [grantAgentSearch, setGrantAgentSearch] = useState("");
  const [grantAgentSuggestionsOpen, setGrantAgentSuggestionsOpen] = useState(false);
  const [grantApplicationId, setGrantApplicationId] = useState("");
  const [grantProfileId, setGrantProfileId] = useState("");
  const [grantStartDate, setGrantStartDate] = useState(todayInput());
  const [grantEndDate, setGrantEndDate] = useState(inDaysInput(365));

  // ── Onglet Suspendre — état ─────────────────────────────────────────────────
  const [suspendAgentSearch, setSuspendAgentSearch] = useState("");
  const [suspendAgentSuggestionsOpen, setSuspendAgentSuggestionsOpen] = useState(false);
  const [selectedSuspendAgent, setSelectedSuspendAgent] = useState<AgentDTO | null>(null);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<null | {
    accId: number;
    profileName: string;
    applicationName: string;
  }>(null);
  const [suspendStartDate, setSuspendStartDate] = useState(todayInput());
  const [suspendEndDate, setSuspendEndDate] = useState("");

  // ── Onglet En lot — état ────────────────────────────────────────────────────
  // ── En lot Attribution (réel)
  const [assignBulkRows, setAssignBulkRows] = useState<ParsedAssignRow[]>([]);
  const [assignBulkFileName, setAssignBulkFileName] = useState<string | null>(null);
  const [assignBulkDragging, setAssignBulkDragging] = useState(false);
  const [assignBulkApplying, setAssignBulkApplying] = useState(false);
  const assignBulkFileRef = useRef<HTMLInputElement>(null);

  // ── En lot Suspension (réel)
  const [suspendBulkRows, setSuspendBulkRows] = useState<ParsedSuspendRow[]>([]);
  const [suspendBulkFileName, setSuspendBulkFileName] = useState<string | null>(null);
  const [suspendBulkDragging, setSuspendBulkDragging] = useState(false);
  const [suspendBulkApplying, setSuspendBulkApplying] = useState(false);
  const suspendBulkFileRef = useRef<HTMLInputElement>(null);

  // ── Pagination
  const [suspendPage, setSuspendPage] = useState(1);
  const [assignBulkPage, setAssignBulkPage] = useState(1);
  const [suspendBulkPage, setSuspendBulkPage] = useState(1);

  const queryClient = useQueryClient();

  // ── Requêtes API — Stats ────────────────────────────────────────────────────

  const { data: dashStats } = useQuery<{
    nbAgentsActifs: number;
    nbProfils: number;
    nbAccesActifs: number;
  }>({
    queryKey: ["dashboard-stats"],
    queryFn: () => fetch(`${API}/dashboard/stats`).then((r) => r.json()),
    staleTime: 30_000,
  });

  // ── Requêtes API — Onglet Attribuer ─────────────────────────────────────────

  const { data: agentResults = [] } = useQuery<AgentDTO[]>({
    queryKey: ["agents-search-grant", grantAgentSearch],
    queryFn: () =>
      fetch(`${API}/agents?q=${encodeURIComponent(grantAgentSearch.trim())}`).then((r) => r.json()),
    enabled: grantAgentSearch.trim().length >= 2,
  });

  const { data: applications = [] } = useQuery<ApplicationDTO[]>({
    queryKey: ["applications"],
    queryFn: () => fetch(`${API}/applications`).then((r) => r.json()),
  });

  const { data: grantProfiles = [] } = useQuery<ProfilDTO[]>({
    queryKey: ["profils", grantApplicationId],
    queryFn: () =>
      fetch(`${API}/profils?applicationCode=${grantApplicationId}`).then((r) => r.json()),
    enabled: !!grantApplicationId,
  });

  // ── Requêtes API — Onglet Suspendre ─────────────────────────────────────────

  const { data: suspendAgentResults = [] } = useQuery<AgentDTO[]>({
    queryKey: ["agents-search-suspend", suspendAgentSearch],
    queryFn: () =>
      fetch(`${API}/agents?q=${encodeURIComponent(suspendAgentSearch.trim())}`).then((r) => r.json()),
    enabled: suspendAgentSearch.trim().length >= 2,
  });

  const { data: suspendHabilitations = [] } = useQuery<HabilitationDTO[]>({
    queryKey: ["habilitations", selectedSuspendAgent?.codeAgent],
    queryFn: () =>
      fetch(`${API}/agents/${selectedSuspendAgent!.codeAgent}/habilitations`).then((r) => r.json()),
    enabled: !!selectedSuspendAgent,
  });

  // ── Mutation : attribuer profil ─────────────────────────────────────────────

  const attribuerMutation = useMutation({
    mutationFn: (body: object) =>
      fetch(`${API}/affectations/attribuer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({ message: "Erreur inconnue" }));
          throw new Error(err.message ?? "Erreur lors de l'attribution");
        }
        return r.json();
      }),
    onSuccess: () => {
      toast.success(`Profil attribué à ${selectedGrantAgent?.nomComplet}.`);
      queryClient.invalidateQueries({ queryKey: ["habilitations", selectedGrantAgent?.codeAgent] });
      setSelectedGrantAgent(null);
      setGrantAgentSearch("");
      setGrantAgentSuggestionsOpen(false);
      setGrantApplicationId("");
      setGrantProfileId("");
      setGrantStartDate(todayInput());
      setGrantEndDate(inDaysInput(365));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleGrant = () => {
    if (!selectedGrantAgent) {
      toast.error("Sélectionnez un agent dans la liste de suggestions.");
      return;
    }
    if (!grantApplicationId || !grantProfileId) {
      toast.error("Choisissez une application et un profil.");
      return;
    }
    if (!grantStartDate || !grantEndDate) {
      toast.error("Les dates de début et de fin sont requises.");
      return;
    }
    if (new Date(grantEndDate) <= new Date(grantStartDate)) {
      toast.error("La date de fin doit être après la date de début.");
      return;
    }
    attribuerMutation.mutate({
      codeAgent:       selectedGrantAgent.codeAgent,
      codeProfil:      parseInt(grantProfileId),
      codeApplication: parseInt(grantApplicationId),
      dateDebut:       grantStartDate,
      dateFin:         grantEndDate,
      loginSaisie:     getLoginSaisie(),
    });
  };

  // ── Mutation : suspendre profil ─────────────────────────────────────────────

  const suspendMutation = useMutation({
    mutationFn: (body: object) =>
      fetch(`${API}/affectations/suspendre`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({ message: "Erreur inconnue" }));
          throw new Error(err.message ?? "Erreur lors de la suspension");
        }
        return r.json();
      }),
    onSuccess: () => {
      toast.success(`Profil "${suspendTarget?.profileName}" suspendu.`);
      queryClient.invalidateQueries({ queryKey: ["habilitations", selectedSuspendAgent?.codeAgent] });
      setSuspendDialogOpen(false);
      setSuspendTarget(null);
      setSuspendStartDate(todayInput());
      setSuspendEndDate("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const suspendRows = useMemo(() => {
    if (!selectedSuspendAgent) return [];
    const todayStr = new Date().toISOString().slice(0, 10);
    return suspendHabilitations
      .filter((h) => h.dateFin === null || h.dateFin > todayStr)
      .map((h) => ({
        accId: h.accId,
        profileName: h.nomProfil,
        applicationName: h.nomApplication ?? "-",
        startDate: h.dateDebut,
        endDate: h.dateFin,
      }))
      .sort((a, b) =>
        `${a.applicationName}-${a.profileName}`.localeCompare(`${b.applicationName}-${b.profileName}`),
      );
  }, [selectedSuspendAgent, suspendHabilitations]);

  // Variables calculées — attribution en lot (réel)
  const assignValidRows = assignBulkRows.filter((r) => r.errors.length === 0);
  const assignErrorRows = assignBulkRows.filter((r) => r.errors.length > 0);
  const assignPendingCount = assignValidRows.filter((r) => !r.status || r.status === "idle").length;
  const assignSuccessCount = assignBulkRows.filter((r) => r.status === "success").length;
  const assignBackendErrorCount = assignBulkRows.filter((r) => r.status === "error").length;

  // Variables calculées — suspension en lot (réel)
  const suspendValidRows = suspendBulkRows.filter((r) => r.errors.length === 0);
  const suspendErrorRows = suspendBulkRows.filter((r) => r.errors.length > 0);
  const suspendPendingCount = suspendValidRows.filter((r) => !r.status || r.status === "idle").length;
  const suspendSuccessCount = suspendBulkRows.filter((r) => r.status === "success").length;
  const suspendBackendErrorCount = suspendBulkRows.filter((r) => r.status === "error").length;

  // ── Pagination — données paginées ──────────────────────────────────────────
  const suspendTotalPages = Math.max(1, Math.ceil(suspendRows.length / PAGE_SIZE));
  const suspendPagedRows = suspendRows.slice((suspendPage - 1) * PAGE_SIZE, suspendPage * PAGE_SIZE);

  const assignBulkTotalPages = Math.max(1, Math.ceil(assignBulkRows.length / PAGE_SIZE));
  const assignBulkPagedRows = assignBulkRows.slice((assignBulkPage - 1) * PAGE_SIZE, assignBulkPage * PAGE_SIZE);

  const suspendBulkTotalPages = Math.max(1, Math.ceil(suspendBulkRows.length / PAGE_SIZE));
  const suspendBulkPagedRows = suspendBulkRows.slice((suspendBulkPage - 1) * PAGE_SIZE, suspendBulkPage * PAGE_SIZE);


  const openSuspendForm = (row: { accId: number; profileName: string; applicationName: string }) => {
    if (!selectedSuspendAgent) {
      toast.error("Saisissez d'abord le matricule de l'agent.");
      return;
    }
    setSuspendTarget({ accId: row.accId, profileName: row.profileName, applicationName: row.applicationName });
    setSuspendStartDate(todayInput());
    setSuspendEndDate("");
    setSuspendDialogOpen(true);
  };

  const handleSuspend = () => {
    if (!selectedSuspendAgent) {
      toast.error("Sélectionnez un agent dans la liste de suggestions.");
      return;
    }
    if (!suspendTarget) {
      toast.error("Choisissez un profil à suspendre.");
      return;
    }
    if (!suspendStartDate) {
      toast.error("La date de début est requise.");
      return;
    }
    if (suspendEndDate && suspendEndDate < suspendStartDate) {
      toast.error("La date de fin doit être égale ou postérieure à la date de début.");
      return;
    }
    suspendMutation.mutate({
      codeAgent:           selectedSuspendAgent.codeAgent,
      accId:               suspendTarget.accId,
      dateDebutSuspension: suspendStartDate,
      dateFinSuspension:   suspendEndDate || null,
      loginSaisie:         getLoginSaisie(),
    });
  };

  // ── En lot Attribution — fonctions ──────────────────────────────────────────

  const downloadAssignTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Matricule", "Code_Application", "Code_Profil", "Date_Debut", "Date_Fin"],
      ["R0012", 11, 11000001, "2026-06-01", "2027-06-01"],
      ["R0197", 60, 60000002, "2026-06-01", ""],
    ]);
    ws["!cols"] = [12, 18, 14, 14, 14].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attribution en lot");
    XLSX.writeFile(wb, "modele_attribution_profils.xlsx");
  };

  const processAssignBulkFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const workbook = XLSX.read(event.target?.result as ArrayBuffer, { type: "array", cellDates: true });
      const rawRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[workbook.SheetNames[0]], {
        header: 1,
        defval: "",
      });
      const dataRows = rawRows
        .slice(1)
        .filter((row) => (row as unknown[]).some((cell) => cell !== "" && cell !== null && cell !== undefined));

      if (dataRows.length > 100) {
        toast.error("Le fichier dépasse la limite de 100 lignes. Veuillez le découper.");
        return;
      }

      const parsed: ParsedAssignRow[] = dataRows.map((row, index) => {
        const [c0, c1, c2, c3, c4] = row as unknown[];
        const errors: string[] = [];

        const matricule = String(c0 ?? "").trim();
        if (!matricule) errors.push("Matricule requis");

        const codeApplication = parseIntCol(c1);
        if (!codeApplication) errors.push("Code_Application invalide (entier requis)");

        const codeProfil = parseIntCol(c2);
        if (!codeProfil) errors.push("Code_Profil invalide (entier requis)");

        const dateDebutIso = parseDate(c3)?.slice(0, 10) ?? null;
        if (!dateDebutIso) errors.push("Date_Debut invalide ou manquante");

        const dateFinRaw = String(c4 ?? "").trim();
        const dateFinIso = dateFinRaw ? (parseDate(c4)?.slice(0, 10) ?? null) : null;
        if (dateFinRaw && !dateFinIso) errors.push("Date_Fin invalide");
        if (dateDebutIso && dateFinIso && dateFinIso <= dateDebutIso) {
          errors.push("Date_Fin doit être après Date_Debut");
        }

        return {
          rowIndex: index + 2,
          matricule,
          codeApplication,
          codeProfil,
          dateDebut: dateDebutIso,
          dateFin: dateFinIso,
          errors,
        };
      });

      setAssignBulkRows(parsed);
      setAssignBulkFileName(file.name);
      setAssignBulkPage(1);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleAssignBulkFile = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Format non supporté. Utilisez .xlsx, .xls ou .csv");
      return;
    }
    processAssignBulkFile(file);
  };

  const handleAssignBulkApply = async () => {
    const validRows = assignBulkRows.filter((r) => r.errors.length === 0 && r.status !== "success");
    if (!validRows.length || assignBulkApplying) return;
    setAssignBulkApplying(true);
    setAssignBulkRows((prev) =>
      prev.map((r) => (r.errors.length === 0 ? { ...r, status: "idle", backendError: undefined } : r)),
    );

    const results = await Promise.allSettled(
      validRows.map((row) =>
        fetch(`${API}/affectations/attribuer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            codeAgent: row.matricule,
            codeProfil: row.codeProfil,
            codeApplication: row.codeApplication,
            dateDebut: row.dateDebut,
            dateFin: row.dateFin,
            loginSaisie: getLoginSaisie(),
          }),
        }).then(async (r) => {
          if (!r.ok) {
            const err = await r.json().catch(() => ({ message: "Erreur inconnue" }));
            throw new Error(err.message ?? "Erreur backend");
          }
          return row.rowIndex;
        }),
      ),
    );

    setAssignBulkRows((prev) =>
      prev.map((row) => {
        const idx = validRows.findIndex((r) => r.rowIndex === row.rowIndex);
        if (idx === -1) return row;
        const res = results[idx];
        return res.status === "fulfilled"
          ? { ...row, status: "success" }
          : { ...row, status: "error", backendError: (res.reason as Error).message };
      }),
    );

    const ok = results.filter((r) => r.status === "fulfilled").length;
    const ko = results.filter((r) => r.status === "rejected").length;
    if (ko === 0) toast.success(`${ok} profil(s) attribué(s) avec succès.`);
    else toast.warning(`${ok} succès, ${ko} erreur(s) — voir le tableau.`);
    setAssignBulkApplying(false);
  };

  // ── En lot Suspension — fonctions ───────────────────────────────────────────

  const downloadSuspendTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Matricule", "Code_Profil", "Date_Debut_Suspension", "Date_Fin_Suspension"],
      ["R0012", 11000001, "2026-06-01", "2026-06-30"],
      ["R0197", 60000002, "2026-06-01", ""],
    ]);
    ws["!cols"] = [12, 14, 22, 22].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Suspension en lot");
    XLSX.writeFile(wb, "modele_suspension_profils.xlsx");
  };

  const processSuspendBulkFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const workbook = XLSX.read(event.target?.result as ArrayBuffer, { type: "array", cellDates: true });
      const rawRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[workbook.SheetNames[0]], {
        header: 1,
        defval: "",
      });
      const dataRows = rawRows
        .slice(1)
        .filter((row) => (row as unknown[]).some((cell) => cell !== "" && cell !== null && cell !== undefined));

      if (dataRows.length > 100) {
        toast.error("Le fichier dépasse la limite de 100 lignes. Veuillez le découper.");
        return;
      }

      // Pré-calcul des clés pour détecter les doublons (matricule + codeProfil)
      const seenKeys = new Map<string, number>(); // key → rowIndex (1-based)

      const parsed: ParsedSuspendRow[] = dataRows.map((row, index) => {
        const [c0, c1, c2, c3] = row as unknown[];
        const errors: string[] = [];

        const matricule = String(c0 ?? "").trim();
        if (!matricule) errors.push("Matricule requis");

        const codeProfil = parseIntCol(c1);
        if (!codeProfil) errors.push("Code_Profil invalide (entier requis)");

        const dateDebutIso = parseDate(c2)?.slice(0, 10) ?? null;
        if (!dateDebutIso) errors.push("Date_Debut_Suspension invalide ou manquante");

        const dateFinRaw = String(c3 ?? "").trim();
        const dateFinIso = dateFinRaw ? (parseDate(c3)?.slice(0, 10) ?? null) : null;
        if (dateFinRaw && !dateFinIso) errors.push("Date_Fin_Suspension invalide");
        if (dateDebutIso && dateFinIso && dateFinIso < dateDebutIso) {
          errors.push("Date_Fin_Suspension doit être égale ou après Date_Debut_Suspension");
        }

        // Détection des doublons (même matricule + même code profil)
        if (matricule && codeProfil) {
          const key = `${matricule}|${codeProfil}`;
          const existingRow = seenKeys.get(key);
          if (existingRow !== undefined) {
            errors.push(`Doublon : même matricule + code profil que la ligne ${existingRow}`);
          } else {
            seenKeys.set(key, index + 2);
          }
        }

        return {
          rowIndex: index + 2,
          matricule,
          codeProfil,
          dateDebut: dateDebutIso,
          dateFin: dateFinIso,
          errors,
        };
      });

      setSuspendBulkRows(parsed);
      setSuspendBulkFileName(file.name);
      setSuspendBulkPage(1);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSuspendBulkFile = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Format non supporté. Utilisez .xlsx, .xls ou .csv");
      return;
    }
    processSuspendBulkFile(file);
  };

  const handleSuspendBulkApply = async () => {
    const validRows = suspendBulkRows.filter((r) => r.errors.length === 0 && r.status !== "success");
    if (!validRows.length || suspendBulkApplying) return;
    setSuspendBulkApplying(true);
    setSuspendBulkRows((prev) =>
      prev.map((r) => (r.errors.length === 0 ? { ...r, status: "idle", backendError: undefined } : r)),
    );

    const results = await Promise.allSettled(
      validRows.map((row) =>
        fetch(`${API}/affectations/suspendre-par-profil`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            codeAgent: row.matricule,
            codeProfil: row.codeProfil,
            dateDebutSuspension: row.dateDebut,
            dateFinSuspension: row.dateFin ?? null,
            loginSaisie: getLoginSaisie(),
          }),
        }).then(async (r) => {
          if (!r.ok) {
            const err = await r.json().catch(() => ({ message: "Erreur inconnue" }));
            throw new Error(err.message ?? "Erreur backend");
          }
          return row.rowIndex;
        }),
      ),
    );

    setSuspendBulkRows((prev) =>
      prev.map((row) => {
        const idx = validRows.findIndex((r) => r.rowIndex === row.rowIndex);
        if (idx === -1) return row;
        const res = results[idx];
        return res.status === "fulfilled"
          ? { ...row, status: "success" }
          : { ...row, status: "error", backendError: (res.reason as Error).message };
      }),
    );

    const ok = results.filter((r) => r.status === "fulfilled").length;
    const ko = results.filter((r) => r.status === "rejected").length;
    if (ko === 0) toast.success(`${ok} profil(s) suspendu(s) avec succès.`);
    else toast.warning(`${ok} succès, ${ko} erreur(s) — voir le tableau.`);
    setSuspendBulkApplying(false);
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
          <p className="text-sm text-muted-foreground">Accès actifs</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold text-foreground">{dashStats?.nbAccesActifs ?? "—"}</p>
              <p className="text-xs text-muted-foreground">droits ouverts en base</p>
            </div>
            <Layers3 className="h-8 w-8 text-cnss-primary" />
          </div>
        </div>
        <div className="cnss-card p-4">
          <p className="text-sm text-muted-foreground">Agents actifs</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold text-foreground">{dashStats?.nbAgentsActifs ?? "—"}</p>
              <p className="text-xs text-muted-foreground">dossier courant</p>
            </div>
            <Users className="h-8 w-8 text-success" />
          </div>
        </div>
        <div className="cnss-card p-4">
          <p className="text-sm text-muted-foreground">Profils définis</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold text-foreground">{dashStats?.nbProfils ?? "—"}</p>
              <p className="text-xs text-muted-foreground">profils en base</p>
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

        {/* ── Onglet Attribuer ──────────────────────────────────────────────── */}
        <TabsContent value="assign" className="space-y-4">
          <section className="cnss-card space-y-5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cnss-accent-soft text-cnss-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Attribuer un nouveau profil</h2>
                <p className="text-sm text-muted-foreground">Sélectionnez l'agent puis renseignez la ligne d'attribution dans le tableau.</p>
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
                      setSelectedGrantAgent(null);
                      setGrantAgentSuggestionsOpen(true);
                    }}
                    onFocus={() => setGrantAgentSuggestionsOpen(true)}
                    onBlur={() => setTimeout(() => setGrantAgentSuggestionsOpen(false), 150)}
                    placeholder="Rechercher par nom ou code agent (min. 2 caractères)"
                    autoComplete="off"
                  />
                  {grantAgentSuggestionsOpen && grantAgentSearch.trim().length >= 2 && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
                      {agentResults.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">Aucun agent trouvé pour cette recherche.</p>
                      ) : (
                        agentResults.map((agent) => (
                          <button
                            key={agent.codeAgent}
                            type="button"
                            className="w-full rounded-sm px-3 py-2 text-left hover:bg-muted/60"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              setGrantAgentSearch(agent.nomComplet);
                              setSelectedGrantAgent(agent);
                              setGrantAgentSuggestionsOpen(false);
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
                    {selectedGrantAgent
                      ? `${selectedGrantAgent.nomComplet} — ${selectedGrantAgent.codeAgent}${selectedGrantAgent.nomDelegation ? ` · ${selectedGrantAgent.nomDelegation}` : ""}`
                      : "Saisissez un nom ou un code agent pour charger l'agent."}
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
                    <TableHead>D Début</TableHead>
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
                            <SelectItem key={application.code} value={String(application.code)}>
                              {application.code} - {application.nom}
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
                          <SelectValue placeholder={grantApplicationId ? "Choisir un profil" : "Sélectionnez d'abord l'application"} />
                        </SelectTrigger>
                        <SelectContent>
                          {grantProfiles.map((profile) => (
                            <SelectItem key={profile.id} value={String(profile.id)}>
                              {profile.id} - {profile.nom}
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
                        disabled={!selectedGrantAgent || !grantApplicationId || !grantProfileId || attribuerMutation.isPending}
                      >
                        {attribuerMutation.isPending ? "Attribution…" : "Attribuer"}
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
                  setSelectedGrantAgent(null);
                  setGrantAgentSearch("");
                  setGrantAgentSuggestionsOpen(false);
                  setGrantApplicationId("");
                  setGrantProfileId("");
                  setGrantStartDate(todayInput());
                  setGrantEndDate(inDaysInput(365));
                }}
              >
                Réinitialiser
              </Button>
            </div>
          </section>
        </TabsContent>

        {/* ── Onglet Suspendre ──────────────────────────────────────────────── */}
        <TabsContent value="suspend" className="space-y-4">
          <section className="cnss-card space-y-5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-warning-soft text-warning">
                <ShieldOff className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Suspendre un profil</h2>
                <p className="text-sm text-muted-foreground">Sélectionnez les profils à suspendre puis renseignez les dates de suspension.</p>
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
                      setSelectedSuspendAgent(null);
                      setSuspendAgentSuggestionsOpen(true);
                      setSuspendTarget(null);
                      setSuspendDialogOpen(false);
                    }}
                    onFocus={() => setSuspendAgentSuggestionsOpen(true)}
                    onBlur={() => setSuspendAgentSuggestionsOpen(false)}
                    placeholder="Rechercher par nom ou matricule"
                    autoComplete="off"
                  />
                  {suspendAgentSuggestionsOpen && suspendAgentSearch.trim() && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
                      {suspendAgentResults.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">Aucun agent conforme à cette recherche.</p>
                      ) : (
                        suspendAgentResults.map((agent) => (
                          <button
                            key={agent.codeAgent}
                            type="button"
                            className="w-full rounded-sm px-3 py-2 text-left hover:bg-muted/60"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              setSelectedSuspendAgent(agent);
                              setSuspendAgentSearch(agent.codeAgent);
                              setSuspendTarget(null);
                              setSuspendDialogOpen(false);
                              setSuspendAgentSuggestionsOpen(false);
                              setSuspendPage(1);
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
                    {selectedSuspendAgent
                      ? `${selectedSuspendAgent.nomComplet} - ${selectedSuspendAgent.codeAgent}`
                      : "Saisissez un nom ou un matricule pour charger l'agent."}
                  </p>
                </div>
              </FormField>

              <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                {selectedSuspendAgent ? (
                  <>
                    <p className="font-medium text-foreground">{selectedSuspendAgent.nomComplet}</p>
                    <p className="mt-1">{suspendRows.length} profil(s) actifs actuellement.</p>
                  </>
                ) : (
                  <p>Saisissez le nom ou le matricule d'un agent pour afficher ses profils actifs.</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Profils attribués à cet agent</p>
              {!selectedSuspendAgent ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
                  Aucun agent sélectionné.
                </div>
              ) : suspendRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
                  Aucun profil actif à suspendre pour cet agent.
                </div>
              ) : (
                <div className="rounded-lg border border-border">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableHead>Application</TableHead>
                          <TableHead>Profil</TableHead>
                          <TableHead>D Début</TableHead>
                          <TableHead>D Fin</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {suspendPagedRows.map((row) => (
                          <TableRow key={row.accId}>
                            <TableCell>{row.applicationName}</TableCell>
                            <TableCell>{row.profileName}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{row.startDate}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{row.endDate ?? "—"}</TableCell>
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
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Pagination
                    currentPage={suspendPage}
                    totalPages={suspendTotalPages}
                    onPageChange={setSuspendPage}
                    totalItems={suspendRows.length}
                    itemsPerPage={PAGE_SIZE}
                    className="border-t border-border"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedSuspendAgent(null);
                  setSuspendAgentSearch("");
                  setSuspendAgentSuggestionsOpen(false);
                  setSuspendTarget(null);
                  setSuspendDialogOpen(false);
                  setSuspendStartDate(todayInput());
                  setSuspendEndDate("");
                  setSuspendPage(1);
                }}
              >
                Réinitialiser
              </Button>
            </div>
          </section>
        </TabsContent>

        {/* ── Onglet En lot ─────────────────────────────────────────────────── */}
        <TabsContent value="bulk" className="space-y-4">
          <section className="space-y-5 cnss-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cnss-accent-soft text-cnss-primary">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Traitement en lot</h2>
                <p className="text-sm text-muted-foreground">Chargez un fichier Excel puis appliquez par catégorie : attribution ou suspension.</p>
              </div>
            </div>

            <Tabs defaultValue="assign" className="space-y-4">
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-muted/60">
                <TabsTrigger value="assign">Attribution</TabsTrigger>
                <TabsTrigger value="suspend">Suspension</TabsTrigger>
              </TabsList>

              {/* ── Sous-onglet Attribution — API réelle ── */}
              <TabsContent value="assign" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Format : <span className="font-mono text-xs">Matricule | Code_Application | Code_Profil | Date_Debut | Date_Fin (optionnelle)</span> — max 100 lignes
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={downloadAssignTemplate}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Télécharger le modèle
                  </Button>
                </div>

                <div
                  className={cn(
                    "relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors",
                    assignBulkDragging
                      ? "border-cnss-accent bg-cnss-accent-soft"
                      : "border-border bg-muted/20 hover:border-cnss-accent/60 hover:bg-muted/40",
                  )}
                  onDragOver={(event) => { event.preventDefault(); setAssignBulkDragging(true); }}
                  onDragLeave={() => setAssignBulkDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setAssignBulkDragging(false);
                    const file = event.dataTransfer.files[0];
                    if (file) handleAssignBulkFile(file);
                  }}
                  onClick={() => assignBulkFileRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => event.key === "Enter" && assignBulkFileRef.current?.click()}
                  aria-label="Zone de dépôt Excel attribution"
                >
                  <input
                    ref={assignBulkFileRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="sr-only"
                    onChange={(event) => event.target.files?.[0] && handleAssignBulkFile(event.target.files[0])}
                  />
                  {assignBulkFileName ? (
                    <>
                      <FileSpreadsheet className="h-10 w-10 text-cnss-primary" />
                      <p className="text-sm font-medium text-foreground">{assignBulkFileName}</p>
                      <p className="text-xs text-muted-foreground">{assignBulkRows.length} ligne(s) détectée(s)</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-danger"
                        onClick={(event) => {
                          event.stopPropagation();
                          setAssignBulkRows([]);
                          setAssignBulkFileName(null);
                          setAssignBulkPage(1);
                          if (assignBulkFileRef.current) assignBulkFileRef.current.value = "";
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

                {assignBulkRows.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1.5">
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      {assignBulkRows.length} ligne(s)
                    </Badge>
                    {assignValidRows.length > 0 && (
                      <Badge variant="secondary" className="gap-1.5 bg-success-soft text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {assignValidRows.length} valide(s)
                      </Badge>
                    )}
                    {assignErrorRows.length > 0 && (
                      <Badge variant="secondary" className="gap-1.5 bg-danger-soft text-danger">
                        <ShieldOff className="h-3.5 w-3.5" />
                        {assignErrorRows.length} erreur(s) de format
                      </Badge>
                    )}
                    {assignSuccessCount > 0 && (
                      <Badge variant="secondary" className="gap-1.5 bg-success-soft text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {assignSuccessCount} appliqué(s)
                      </Badge>
                    )}
                    {assignBackendErrorCount > 0 && (
                      <Badge variant="secondary" className="gap-1.5 bg-danger-soft text-danger">
                        <ShieldOff className="h-3.5 w-3.5" />
                        {assignBackendErrorCount} rejeté(s) par le serveur
                      </Badge>
                    )}
                  </div>
                )}

                {assignBulkRows.length > 0 && (
                  <div className="rounded-lg border border-border">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="w-10">#</TableHead>
                            <TableHead className="w-16">Statut</TableHead>
                            <TableHead>Matricule</TableHead>
                            <TableHead>App</TableHead>
                            <TableHead>Profil</TableHead>
                            <TableHead>Date début</TableHead>
                            <TableHead>Date fin</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assignBulkPagedRows.map((row) => {
                            const hasFormatError = row.errors.length > 0;
                            const rowClass = row.status === "success"
                              ? "bg-success-soft/20"
                              : row.status === "error" || hasFormatError
                              ? "bg-danger-soft/10 hover:bg-danger-soft/20"
                              : "hover:bg-muted/40";
                            return (
                              <TableRow key={row.rowIndex} className={rowClass}>
                                <TableCell className="font-mono text-xs text-muted-foreground">{row.rowIndex}</TableCell>
                                <TableCell>
                                  {row.status === "success" ? (
                                    <CheckCircle2 className="h-4 w-4 text-success" />
                                  ) : row.status === "error" ? (
                                    <div className="group relative">
                                      <ShieldOff className="h-4 w-4 cursor-help text-danger" />
                                      <div className="pointer-events-none absolute left-6 top-0 z-50 hidden w-72 rounded-lg border border-border bg-popover p-2 shadow-lg group-hover:block">
                                        <p className="text-xs text-danger">· {row.backendError}</p>
                                      </div>
                                    </div>
                                  ) : hasFormatError ? (
                                    <div className="group relative">
                                      <ShieldOff className="h-4 w-4 cursor-help text-danger" />
                                      <div className="pointer-events-none absolute left-6 top-0 z-50 hidden w-72 rounded-lg border border-border bg-popover p-2 shadow-lg group-hover:block">
                                        <ul className="space-y-0.5">
                                          {row.errors.map((error, i) => (
                                            <li key={i} className="text-xs text-danger">· {error}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4 text-success" />
                                  )}
                                </TableCell>
                                <TableCell className="text-sm">{row.matricule || "—"}</TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">{row.codeApplication ?? "—"}</TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">{row.codeProfil ?? "—"}</TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">{row.dateDebut ?? "—"}</TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">{row.dateFin ?? "—"}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <Pagination
                      currentPage={assignBulkPage}
                      totalPages={assignBulkTotalPages}
                      onPageChange={setAssignBulkPage}
                      totalItems={assignBulkRows.length}
                      itemsPerPage={PAGE_SIZE}
                      className="border-t border-border"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-5 py-4">
                  <p className="text-sm text-muted-foreground">Seules les lignes valides (sans erreur de format) seront envoyées.</p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={handleAssignBulkApply}
                      disabled={assignPendingCount === 0 || assignBulkApplying}
                    >
                      {assignBulkApplying ? `Application en cours… (${assignSuccessCount + assignBackendErrorCount}/${assignValidRows.length})` : `Appliquer les attributions (${assignPendingCount})`}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={assignBulkApplying}
                      onClick={() => {
                        setAssignBulkRows([]);
                        setAssignBulkFileName(null);
                        setAssignBulkPage(1);
                        if (assignBulkFileRef.current) assignBulkFileRef.current.value = "";
                      }}
                    >
                      Réinitialiser
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* ── Sous-onglet Suspension — API réelle ── */}
              <TabsContent value="suspend" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Format : Matricule | Code_Profil | Date_Debut_Suspension | Date_Fin_Suspension (optionnelle)</p>
                  <Button type="button" variant="outline" size="sm" onClick={downloadSuspendTemplate}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Télécharger le modèle
                  </Button>
                </div>

                <div
                  className={cn(
                    "relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors",
                    suspendBulkDragging
                      ? "border-cnss-accent bg-cnss-accent-soft"
                      : "border-border bg-muted/20 hover:border-cnss-accent/60 hover:bg-muted/40",
                  )}
                  onDragOver={(event) => { event.preventDefault(); setSuspendBulkDragging(true); }}
                  onDragLeave={() => setSuspendBulkDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setSuspendBulkDragging(false);
                    const file = event.dataTransfer.files[0];
                    if (file) handleSuspendBulkFile(file);
                  }}
                  onClick={() => suspendBulkFileRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => event.key === "Enter" && suspendBulkFileRef.current?.click()}
                  aria-label="Zone de dépôt Excel suspension en lot"
                >
                  <input
                    ref={suspendBulkFileRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="sr-only"
                    onChange={(event) => event.target.files?.[0] && handleSuspendBulkFile(event.target.files[0])}
                  />
                  {suspendBulkFileName ? (
                    <>
                      <FileSpreadsheet className="h-10 w-10 text-cnss-primary" />
                      <p className="text-sm font-medium text-foreground">{suspendBulkFileName}</p>
                      <p className="text-xs text-muted-foreground">{suspendBulkRows.length} ligne(s) détectée(s)</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-danger"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSuspendBulkRows([]);
                          setSuspendBulkFileName(null);
                          setSuspendBulkPage(1);
                          if (suspendBulkFileRef.current) suspendBulkFileRef.current.value = "";
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
                      <p className="text-xs text-muted-foreground">.xlsx · .xls · .csv — max 100 lignes</p>
                    </>
                  )}
                </div>

                {suspendBulkRows.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1.5">
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      {suspendBulkRows.length} ligne(s)
                    </Badge>
                    {suspendValidRows.length > 0 && (
                      <Badge variant="secondary" className="gap-1.5 bg-success-soft text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {suspendValidRows.length} valide(s)
                      </Badge>
                    )}
                    {suspendErrorRows.length > 0 && (
                      <Badge variant="secondary" className="gap-1.5 bg-danger-soft text-danger">
                        <ShieldOff className="h-3.5 w-3.5" />
                        {suspendErrorRows.length} erreur(s) de format
                      </Badge>
                    )}
                    {suspendSuccessCount > 0 && (
                      <Badge variant="secondary" className="gap-1.5 bg-success-soft text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {suspendSuccessCount} appliqué(s)
                      </Badge>
                    )}
                    {suspendBackendErrorCount > 0 && (
                      <Badge variant="secondary" className="gap-1.5 bg-danger-soft text-danger">
                        <ShieldOff className="h-3.5 w-3.5" />
                        {suspendBackendErrorCount} rejeté(s) par le serveur
                      </Badge>
                    )}
                  </div>
                )}

                {suspendBulkRows.length > 0 && (
                  <div className="rounded-lg border border-border">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="w-10">#</TableHead>
                            <TableHead className="w-16">Statut</TableHead>
                            <TableHead>Matricule</TableHead>
                            <TableHead>Profil</TableHead>
                            <TableHead>Début suspension</TableHead>
                            <TableHead>Fin suspension</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {suspendBulkPagedRows.map((row) => {
                            const hasFormatError = row.errors.length > 0;
                            const rowClass = row.status === "success"
                              ? "bg-success-soft/20"
                              : row.status === "error" || hasFormatError
                              ? "bg-danger-soft/10 hover:bg-danger-soft/20"
                              : "hover:bg-muted/40";
                            return (
                              <TableRow key={row.rowIndex} className={rowClass}>
                                <TableCell className="font-mono text-xs text-muted-foreground">{row.rowIndex}</TableCell>
                                <TableCell>
                                  {row.status === "success" ? (
                                    <CheckCircle2 className="h-4 w-4 text-success" />
                                  ) : row.status === "error" ? (
                                    <div className="group relative">
                                      <ShieldOff className="h-4 w-4 cursor-help text-danger" />
                                      <div className="pointer-events-none absolute left-6 top-0 z-50 hidden w-72 rounded-lg border border-border bg-popover p-2 shadow-lg group-hover:block">
                                        <p className="text-xs text-danger">· {row.backendError}</p>
                                      </div>
                                    </div>
                                  ) : hasFormatError ? (
                                    <div className="group relative">
                                      <ShieldOff className="h-4 w-4 cursor-help text-danger" />
                                      <div className="pointer-events-none absolute left-6 top-0 z-50 hidden w-72 rounded-lg border border-border bg-popover p-2 shadow-lg group-hover:block">
                                        <ul className="space-y-0.5">
                                          {row.errors.map((error, i) => (
                                            <li key={i} className="text-xs text-danger">· {error}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4 text-success" />
                                  )}
                                </TableCell>
                                <TableCell className="text-sm">{row.matricule || "—"}</TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">{row.codeProfil ?? "—"}</TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">{row.dateDebut ?? "—"}</TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">{row.dateFin ?? "—"}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <Pagination
                      currentPage={suspendBulkPage}
                      totalPages={suspendBulkTotalPages}
                      onPageChange={setSuspendBulkPage}
                      totalItems={suspendBulkRows.length}
                      itemsPerPage={PAGE_SIZE}
                      className="border-t border-border"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-5 py-4">
                  <p className="text-sm text-muted-foreground">Seules les lignes valides (sans erreur de format) seront envoyées.</p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleSuspendBulkApply}
                      disabled={suspendPendingCount === 0 || suspendBulkApplying}
                    >
                      {suspendBulkApplying
                        ? `Application en cours… (${suspendSuccessCount + suspendBackendErrorCount}/${suspendValidRows.length})`
                        : `Appliquer les suspensions (${suspendPendingCount})`}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={suspendBulkApplying}
                      onClick={() => {
                        setSuspendBulkRows([]);
                        setSuspendBulkFileName(null);
                        setSuspendBulkPage(1);
                        if (suspendBulkFileRef.current) suspendBulkFileRef.current.value = "";
                      }}
                    >
                      Réinitialiser
                    </Button>
                  </div>
                </div>
              </TabsContent>
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
                : "Sélectionnez un profil à suspendre."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField id="suspend-start-date" label="Date de début" required>
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
              Note : pour une suspension totale, laissez la date de fin vide. Pour une suspension sur une durée précise, renseignez la date de fin.
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
