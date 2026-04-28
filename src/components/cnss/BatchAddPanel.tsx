import { useCallback, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useDemo } from "@/state/DemoState";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  Download,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  Send,
} from "lucide-react";
import { toast } from "sonner";

/* ─── types ─────────────────────────────────────────────────── */
interface ParsedAddRow {
  rowIndex: number;
  matricule: string;
  appName: string;
  profileName: string;
  moduleName: string;
  startRaw: string;
  endRaw: string;
  justification: string;
  // resolved
  agentId?: string;
  agentFullName?: string;
  applicationId?: string;
  profileId?: string;
  moduleId?: string;
  startIso?: string;
  endIso?: string;
  errors: string[];
}

/* ─── helpers ────────────────────────────────────────────────── */
const parseDate = (val: unknown): string | undefined => {
  if (!val && val !== 0) return undefined;
  // XLSX can give us a JS Date when cellDates:true
  if (val instanceof Date) return isNaN(val.getTime()) ? undefined : val.toISOString();
  const s = String(val).trim();
  // DD/MM/YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const d = new Date(`${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  // ISO / other
  const d2 = new Date(s);
  return isNaN(d2.getTime()) ? undefined : d2.toISOString();
};

const downloadTemplate = () => {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Matricule", "Application", "Profil", "Module", "Date_Debut", "Date_Fin", "Justification"],
    [
      "CNSS-10421",
      "SIRH",
      "Gestionnaire RH",
      "Gestion des absences",
      "01/05/2026",
      "31/12/2026",
      "Renfort équipe RH pour la période de clôture.",
    ],
    [
      "CNSS-11102",
      "Comptabilité Générale",
      "Comptable",
      "Saisie écritures",
      "01/06/2026",
      "30/09/2026",
      "Mission temporaire périmètre Finance.",
    ],
  ]);
  // column widths
  ws["!cols"] = [14, 24, 22, 26, 14, 14, 44].map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ajout en lot");
  XLSX.writeFile(wb, "modele_ajout_en_lot.xlsx");
};

/* ─── component ──────────────────────────────────────────────── */
export function BatchAddPanel() {
  const { agents, applications, profiles, modules, createBatch } = useDemo();

  const [rows, setRows] = useState<ParsedAddRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── parse ── */
  const processFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target?.result as ArrayBuffer, {
          type: "array",
          cellDates: true,
        });
        const raw = XLSX.utils.sheet_to_json<unknown[]>(
          wb.Sheets[wb.SheetNames[0]],
          { header: 1, defval: "" },
        );

        const dataRows = raw.slice(1).filter((r) =>
          (r as unknown[]).some((c) => c !== "" && c !== null && c !== undefined),
        );

        const parsed: ParsedAddRow[] = dataRows.map((r, idx) => {
          const [c0, c1, c2, c3, c4, c5, c6] = r as unknown[];
          const matricule = String(c0 ?? "").trim();
          const appName = String(c1 ?? "").trim();
          const profileName = String(c2 ?? "").trim();
          const moduleName = String(c3 ?? "").trim();
          const startRaw = String(c4 ?? "").trim();
          const endRaw = String(c5 ?? "").trim();
          const justification = String(c6 ?? "").trim();
          const errors: string[] = [];

          const agent = agents.find((a) => a.matricule === matricule);
          if (!matricule) errors.push("Matricule requis");
          else if (!agent) errors.push(`Agent "${matricule}" introuvable`);

          const app = applications.find(
            (a) => a.name.toLowerCase() === appName.toLowerCase(),
          );
          if (!appName) errors.push("Application requise");
          else if (!app) errors.push(`Application "${appName}" introuvable`);

          if (agent && app && agent.domain !== app.domain)
            errors.push(`Domaine incompatible : agent=${agent.domain}, app=${app.domain}`);

          const profile = app
            ? profiles.find(
                (p) =>
                  p.applicationId === app.id &&
                  p.name.toLowerCase() === profileName.toLowerCase(),
              )
            : undefined;
          if (!profileName) errors.push("Profil requis");
          else if (app && !profile)
            errors.push(`Profil "${profileName}" introuvable pour ${app.name}`);

          const mod = profile
            ? modules.find(
                (m) =>
                  m.profileId === profile.id &&
                  m.name.toLowerCase() === moduleName.toLowerCase(),
              )
            : undefined;
          if (!moduleName) errors.push("Module requis");
          else if (profile && !mod)
            errors.push(`Module "${moduleName}" introuvable`);

          const startIso = parseDate(c4);
          const endIso = parseDate(c5);
          if (!startRaw && !(c4 instanceof Date)) errors.push("Date de début requise");
          else if (!startIso) errors.push(`Date de début invalide : "${startRaw}"`);
          if (!endRaw && !(c5 instanceof Date)) errors.push("Date de fin requise");
          else if (!endIso) errors.push(`Date de fin invalide : "${endRaw}"`);
          if (startIso && endIso && endIso <= startIso)
            errors.push("La date de fin doit être après la date de début");

          if (!justification || justification.length < 10)
            errors.push("Justification trop courte (10 car. min.)");

          return {
            rowIndex: idx + 2,
            matricule,
            appName,
            profileName,
            moduleName,
            startRaw,
            endRaw,
            justification,
            agentId: agent?.id,
            agentFullName: agent ? `${agent.firstName} ${agent.lastName}` : undefined,
            applicationId: app?.id,
            profileId: profile?.id,
            moduleId: mod?.id,
            startIso,
            endIso,
            errors,
          };
        });

        setRows(parsed);
        setFileName(file.name);
      };
      reader.readAsArrayBuffer(file);
    },
    [agents, applications, profiles, modules],
  );

  const onFile = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Format non supporté. Utilisez .xlsx, .xls ou .csv");
      return;
    }
    processFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  /* ── apply ── */
  const validRows = rows.filter((r) => r.errors.length === 0);

  const onApply = () => {
    if (validRows.length === 0 || !fileName) return;
    const requests = validRows.map((r) => ({
      operation: "ADD" as const,
      beneficiaryId: r.agentId!,
      applicationId: r.applicationId!,
      profileId: r.profileId!,
      moduleId: r.moduleId!,
      startDate: r.startIso!,
      endDate: r.endIso!,
      justification: r.justification,
    }));
    const batchId = createBatch({
      operation: "ADD",
      fileName,
      requests,
    });
    if (batchId) {
      toast.success(`Lot "${fileName}" soumis avec succès (${requests.length} demande(s)). En attente de validation.`);
      setRows([]);
      setFileName(null);
    }
  };

  /* ── render ── */
  const invalid = rows.filter((r) => r.errors.length > 0);

  return (
    <div className="space-y-5">
      {/* Actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Importez un fichier Excel avec le modèle prédéfini. Chaque ligne sera soumise
            comme une demande en attente de validation.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="mr-2 h-4 w-4" />
          Télécharger le modèle
        </Button>
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors",
          isDragging
            ? "border-cnss-accent bg-cnss-accent-soft"
            : "border-border bg-muted/20 hover:border-cnss-accent/60 hover:bg-muted/40",
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
        aria-label="Zone de dépôt de fichier Excel"
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="sr-only"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
        {fileName ? (
          <>
            <FileSpreadsheet className="h-10 w-10 text-cnss-primary" />
            <p className="text-sm font-medium text-foreground">{fileName}</p>
            <p className="text-xs text-muted-foreground">
              {rows.length} ligne(s) détectée(s) — {validRows.length} valide(s),{" "}
              {invalid.length} erreur(s)
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-danger"
              onClick={(e) => {
                e.stopPropagation();
                setRows([]);
                setFileName(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Supprimer
            </Button>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Glissez un fichier ici ou cliquez pour parcourir
            </p>
            <p className="text-xs text-muted-foreground">.xlsx · .xls · .csv</p>
          </>
        )}
      </div>

      {/* Summary badges */}
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            {rows.length} ligne(s)
          </span>
          {validRows.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-soft px-3 py-1 text-xs font-medium text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {validRows.length} valide(s)
            </span>
          )}
          {invalid.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger-soft px-3 py-1 text-xs font-medium text-danger">
              <XCircle className="h-3.5 w-3.5" />
              {invalid.length} erreur(s)
            </span>
          )}
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10">#</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Application</TableHead>
                <TableHead>Profil</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Début</TableHead>
                <TableHead>Fin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const ok = row.errors.length === 0;
                return (
                  <TableRow
                    key={row.rowIndex}
                    className={cn(
                      ok ? "hover:bg-success-soft/20" : "bg-danger-soft/10 hover:bg-danger-soft/20",
                    )}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {row.rowIndex}
                    </TableCell>
                    <TableCell>
                      {ok ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <div className="group relative">
                          <AlertTriangle className="h-4 w-4 cursor-help text-danger" />
                          <div className="pointer-events-none absolute left-6 top-0 z-50 hidden w-64 rounded-lg border border-border bg-popover p-2 shadow-lg group-hover:block">
                            <ul className="space-y-0.5">
                              {row.errors.map((e, i) => (
                                <li key={i} className="text-xs text-danger">
                                  · {e}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.agentFullName ?? (
                        <span className="text-danger">{row.matricule}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{row.appName || "—"}</TableCell>
                    <TableCell className="text-sm">{row.profileName || "—"}</TableCell>
                    <TableCell className="text-sm">{row.moduleName || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.startRaw || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.endRaw || "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Apply button */}
      {rows.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-5 py-4">
          <p className="text-sm text-muted-foreground">
            {invalid.length > 0 && (
              <span className="mr-2 inline-flex items-center gap-1 text-warning">
                <AlertTriangle className="h-3.5 w-3.5" />
                {invalid.length} ligne(s) ignorée(s)
              </span>
            )}
            {validRows.length > 0
              ? `${validRows.length} demande(s) seront soumises pour validation.`
              : "Aucune ligne valide à soumettre."}
          </p>
          <Button onClick={onApply} disabled={validRows.length === 0}>
            <Send className="mr-2 h-4 w-4" />
            Appliquer ({validRows.length})
          </Button>
        </div>
      )}
    </div>
  );
}
