import { useCallback, useMemo, useState } from "react";
import { useDemo } from "@/state/DemoState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  ChevronRight,
  ArrowLeft,
  UserPlus,
  ShieldOff,
  CheckSquare,
  Square,
} from "lucide-react";
import type { BatchRequest } from "@/mocks/types";

type Decision = "APPROVED" | "REJECTED";

export function BatchValidationPanel() {
  const { batches, agents, applications, profiles, modules, users, decideBatchRequests } = useDemo();

  // Get pending batches
  const pendingBatches = useMemo(
    () =>
      batches
        .filter((b) => b.status === "PENDING")
        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [batches],
  );

  const [selectedBatch, setSelectedBatch] = useState<BatchRequest | null>(null);
  const [selectedDecisions, setSelectedDecisions] = useState<Map<string, Decision>>(new Map());
  const [comment, setComment] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Helpers
  const beneficiaryName = (id: string) => {
    const a = agents.find((x) => x.id === id);
    return a ? `${a.firstName} ${a.lastName}` : "—";
  };
  const appName = (id: string) => applications.find((a) => a.id === id)?.name ?? id;
  const profileName = (id: string) => profiles.find((p) => p.id === id)?.name ?? id;
  const moduleName = (id: string) => modules.find((m) => m.id === id)?.name ?? id;
  const requesterName = (id: string) => users.find((u) => u.id === id)?.name ?? id;

  // Selection handlers for batch content
  const toggleAll = useCallback((decision: Decision) => {
    if (!selectedBatch) return;
    const allSelected = selectedDecisions.size === selectedBatch.requests.length;
    if (allSelected) {
      setSelectedDecisions(new Map());
    } else {
      const newMap = new Map<string, Decision>();
      selectedBatch.requests.forEach((r) => newMap.set(r.id, decision));
      setSelectedDecisions(newMap);
    }
  }, [selectedBatch, selectedDecisions]);

  const toggleOne = useCallback((requestId: string, decision: Decision) => {
    setSelectedDecisions((prev) => {
      const next = new Map(prev);
      if (next.get(requestId) === decision) {
        next.delete(requestId);
      } else {
        next.set(requestId, decision);
      }
      return next;
    });
  }, []);

  // Count decisions
  const approvedCount = Array.from(selectedDecisions.values()).filter((d) => d === "APPROVED").length;
  const rejectedCount = Array.from(selectedDecisions.values()).filter((d) => d === "REJECTED").length;

  // Validation
  const onValidate = () => {
    if (!selectedBatch) return;
    if (selectedDecisions.size === 0) {
      toast.error("Sélectionnez au moins une décision.");
      return;
    }
    if (!comment.trim()) {
      toast.error("Veuillez saisir un commentaire de décision.");
      return;
    }
    setConfirmOpen(true);
  };

  const confirmDecision = () => {
    if (!selectedBatch) return;

    const decisions = Array.from(selectedDecisions.entries()).map(([requestId, decision]) => ({
      requestId,
      decision,
    }));

    decideBatchRequests(selectedBatch.id, decisions, comment.trim());

    toast.success(
      `Lot "${selectedBatch.fileName}" traité : ${approvedCount} approuvée(s), ${rejectedCount} rejetée(s).`
    );

    setSelectedBatch(null);
    setSelectedDecisions(new Map());
    setComment("");
    setConfirmOpen(false);
  };

  // No batches view
  if (pendingBatches.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-8 text-center">
        <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium text-foreground">Aucun lot en attente</p>
        <p className="mt-1 text-xs text-muted-foreground">Les lots soumis apparaîtront ici pour validation.</p>
      </div>
    );
  }

  // Batch list view
  if (!selectedBatch) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Cliquez sur un lot pour voir son contenu et valider les demandes individuellement.
        </p>

        <div className="grid gap-3">
          {pendingBatches.map((batch) => (
            <button
              key={batch.id}
              onClick={() => setSelectedBatch(batch)}
              className="w-full rounded-xl border border-border bg-muted/20 p-4 text-left transition-colors hover:border-cnss-accent/40 hover:bg-muted/40"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      batch.operation === "ADD" ? "bg-success-soft" : "bg-warning-soft"
                    )}
                  >
                    {batch.operation === "ADD" ? (
                      <UserPlus className="h-5 w-5 text-success" />
                    ) : (
                      <ShieldOff className="h-5 w-5 text-warning" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{batch.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {batch.requests.length} demande(s) · Par {requesterName(batch.requesterId)} · {formatRelative(batch.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                      batch.operation === "ADD"
                        ? "bg-success-soft text-success"
                        : "bg-warning-soft text-warning"
                    )}
                  >
                    {batch.operation === "ADD" ? "AJOUT" : "RETRAIT"}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Batch detail view
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => {
            setSelectedBatch(null);
            setSelectedDecisions(new Map());
          }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux lots
        </button>
        <span
          className={cn(
            "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
            selectedBatch.operation === "ADD"
              ? "bg-success-soft text-success"
              : "bg-warning-soft text-warning"
          )}
        >
          {selectedBatch.operation === "ADD" ? "LOT D'AJOUT" : "LOT DE RETRAIT"}
        </span>
      </div>

      {/* Batch info */}
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-8 w-8 text-cnss-primary" />
          <div>
            <p className="font-semibold text-foreground">{selectedBatch.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {selectedBatch.requests.length} demande(s) · Soumis par {requesterName(selectedBatch.requesterId)} · {formatRelative(selectedBatch.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => toggleAll("APPROVED")}>
          <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
          Tout approuver
        </Button>
        <Button variant="outline" size="sm" onClick={() => toggleAll("REJECTED")}>
          <XCircle className="mr-1.5 h-3.5 w-3.5" />
          Tout rejeter
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setSelectedDecisions(new Map())}>
          <Square className="mr-1.5 h-3.5 w-3.5" />
          Tout désélectionner
        </Button>
      </div>

      {/* Summary */}
      {selectedDecisions.size > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cnss-accent/30 bg-cnss-accent-soft px-3 py-1 text-xs font-medium text-cnss-accent">
            {selectedDecisions.size} sélectionnée(s)
          </span>
          {approvedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-soft px-3 py-1 text-xs font-medium text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {approvedCount} à approuver
            </span>
          )}
          {rejectedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger-soft px-3 py-1 text-xs font-medium text-danger">
              <XCircle className="h-3.5 w-3.5" />
              {rejectedCount} à rejeter
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10">Action</TableHead>
              <TableHead>Bénéficiaire</TableHead>
              <TableHead>Application</TableHead>
              <TableHead>Profil / Module</TableHead>
              <TableHead>Justification</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedBatch.requests.map((r) => {
              const currentDecision = selectedDecisions.get(r.id);
              return (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40">
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleOne(r.id, "APPROVED")}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded transition-colors",
                          currentDecision === "APPROVED"
                            ? "bg-success text-success-foreground"
                            : "hover:bg-success-soft text-muted-foreground hover:text-success"
                        )}
                        title="Approuver"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleOne(r.id, "REJECTED")}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded transition-colors",
                          currentDecision === "REJECTED"
                            ? "bg-danger text-danger-foreground"
                            : "hover:bg-danger-soft text-muted-foreground hover:text-danger"
                        )}
                        title="Rejeter"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{beneficiaryName(r.beneficiaryId)}</TableCell>
                  <TableCell>{appName(r.applicationId)}</TableCell>
                  <TableCell className="text-xs">
                    <p className="font-medium">{profileName(r.profileId)}</p>
                    <p className="text-muted-foreground">{moduleName(r.moduleId)}</p>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                    {r.justification}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Comment and actions */}
      <div className="rounded-xl border border-border bg-muted/20 p-5">
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Commentaire de décision <span className="text-danger">*</span>
          </label>
          <Textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Expliquez la décision pour traçabilité…"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {selectedDecisions.size > 0
              ? `${selectedDecisions.size} demande(s) sélectionnée(s)`
              : "Sélectionnez les demandes à traiter."}
          </p>
          <Button onClick={onValidate} disabled={selectedDecisions.size === 0}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Valider les décisions ({selectedDecisions.size})
          </Button>
        </div>
      </div>

      {/* Confirm dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">Confirmer les décisions</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {approvedCount > 0 && `${approvedCount} demande(s) seront approuvée(s). `}
              {rejectedCount > 0 && `${rejectedCount} demande(s) seront rejetée(s).`}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Annuler
              </Button>
              <Button onClick={confirmDecision}>Confirmer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
