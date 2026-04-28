import { useEffect, useMemo, useState } from "react";
import { useDemo } from "@/state/DemoState";
import { PageHeader } from "@/components/cnss/PageHeader";
import { StatusBadge } from "@/components/cnss/StatusBadge";
import { EmptyState } from "@/components/cnss/EmptyState";
import { BatchValidationPanel } from "@/components/cnss/BatchValidationPanel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Inbox, ClipboardCheck, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatRelative } from "@/lib/format";
import { toast } from "sonner";

type Decision = "APPROVED" | "REJECTED";

export default function ValidationQueue() {
  const { requests, agents, applications, profiles, modules, users, decideRequest } = useDemo();

  // Only individual requests (not part of a batch)
  const pending = useMemo(
    () =>
      requests
        .filter((r) => r.status === "PENDING" && !r.batchId)
        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [requests],
  );

  const [selectedId, setSelectedId] = useState<string | null>(pending[0]?.id ?? null);
  const [comment, setComment] = useState("");
  const [confirm, setConfirm] = useState<Decision | null>(null);

  const selected = useMemo(
    () => pending.find((r) => r.id === selectedId) ?? pending[0] ?? null,
    [pending, selectedId],
  );

  // Auto-select first pending if current selection no longer pending
  useEffect(() => {
    if (!selected && pending[0]) setSelectedId(pending[0].id);
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [pending, selected, selectedId]);

  const beneficiaryName = (id: string) => {
    const a = agents.find((x) => x.id === id);
    return a ? `${a.firstName} ${a.lastName}` : "—";
  };
  const beneficiaryMatricule = (id: string) =>
    agents.find((x) => x.id === id)?.matricule ?? "—";
  const appName = (id: string) => applications.find((a) => a.id === id)?.name ?? id;
  const profileName = (id: string) => profiles.find((p) => p.id === id)?.name ?? id;
  const moduleName = (id: string) => modules.find((m) => m.id === id)?.name ?? id;
  const requesterName = (id: string) => users.find((u) => u.id === id)?.name ?? id;

  const onDecide = (decision: Decision) => {
    if (!selected) return;
    if (!comment.trim()) {
      toast.error("Veuillez saisir un commentaire de décision.");
      return;
    }
    setConfirm(decision);
  };

  const confirmDecision = () => {
    if (!selected || !confirm) return;
    decideRequest(selected.id, confirm, comment.trim());
    toast.success(
      confirm === "APPROVED"
        ? "Demande approuvée — l'agent sera notifié (mode démo)."
        : "Demande rejetée — la décision a été enregistrée.",
    );
    setComment("");
    setConfirm(null);
    // Auto-select next pending
    const next = pending.find((r) => r.id !== selected.id);
    setSelectedId(next ? next.id : null);
  };

  return (
    <div className="cnss-page space-y-6">
      <PageHeader
        title="File de validation"
        subtitle="Traitez les demandes individuelles ou appliquez des modifications en lot."
      />

      <Tabs defaultValue="queue" className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-muted/60 sm:w-auto sm:inline-grid">
          <TabsTrigger value="queue" className="gap-2">
            <ClipboardCheck className="h-4 w-4" />
            <span className="hidden sm:inline">
              Validation individuelle
              {pending.length > 0 && (
                <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-cnss-primary text-[10px] font-bold text-primary-foreground">
                  {pending.length}
                </span>
              )}
            </span>
            <span className="sm:hidden">
              Individuel
              {pending.length > 0 && (
                <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-cnss-primary text-[10px] font-bold text-primary-foreground">
                  {pending.length}
                </span>
              )}
            </span>
          </TabsTrigger>

          <TabsTrigger value="batch-validation" className="gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Validation en lot</span>
            <span className="sm:hidden">Lot</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1 : validation queue (existing) ── */}
        <TabsContent value="queue" className="mt-0">
          {pending.length === 0 ? (
            <div className="cnss-card p-6">
              <EmptyState
                icon={Inbox}
                title="Aucune demande en attente"
                description="Tout est à jour. La file de validation est vide pour le moment."
              />
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
              {/* List */}
              <aside
                aria-label="Demandes en attente"
                className="cnss-card max-h-[calc(100vh-220px)] overflow-y-auto p-2"
              >
                <ul className="space-y-1">
                  {pending.map((r) => {
                    const isActive = selected?.id === r.id;
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(r.id)}
                          className={cn(
                            "w-full rounded-lg border border-transparent px-3 py-3 text-left transition-colors",
                            isActive
                              ? "border-cnss-accent/40 bg-cnss-accent-soft"
                              : "hover:bg-muted/60",
                          )}
                          aria-current={isActive ? "true" : undefined}
                        >
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                                  r.operation === "ADD"
                                    ? "bg-success-soft text-success"
                                    : "bg-warning-soft text-warning",
                                )}
                              >
                                {r.operation === "ADD" ? "+" : "−"}
                              </span>
                              <span className="truncate text-sm font-semibold text-foreground">
                                {beneficiaryName(r.beneficiaryId)}
                              </span>
                            </div>
                            <StatusBadge status={r.status} />
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {appName(r.applicationId)}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Par {requesterName(r.requesterId)} · {formatRelative(r.createdAt)}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </aside>

              {/* Detail + decision */}
              {selected && (
                <section
                  aria-label="Détails de la demande"
                  className="cnss-card flex flex-col p-6"
                >
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                            selected.operation === "ADD"
                              ? "bg-success-soft text-success"
                              : "bg-warning-soft text-warning",
                          )}
                        >
                          {selected.operation === "ADD" ? "AJOUT" : "RETRAIT"}
                        </span>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Demande
                        </p>
                      </div>
                      <h2 className="text-xl font-semibold text-foreground">
                        {beneficiaryName(selected.beneficiaryId)}
                        <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">
                          {beneficiaryMatricule(selected.beneficiaryId)}
                        </span>
                      </h2>
                    </div>
                    <StatusBadge status={selected.status} />
                  </div>

                  <dl className="grid gap-4 border-y border-border py-5 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Demandeur
                      </dt>
                      <dd className="text-foreground">
                        {requesterName(selected.requesterId)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Application
                      </dt>
                      <dd className="text-foreground">{appName(selected.applicationId)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Profil
                      </dt>
                      <dd className="text-foreground">{profileName(selected.profileId)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Module
                      </dt>
                      <dd className="text-foreground">{moduleName(selected.moduleId)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Période demandée
                      </dt>
                      <dd className="text-foreground">
                        {formatDate(selected.startDate)} → {formatDate(selected.endDate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Soumise
                      </dt>
                      <dd className="text-foreground">{formatRelative(selected.createdAt)}</dd>
                    </div>
                  </dl>

                  <div className="py-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Justification
                    </p>
                    <p className="mt-1 rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">
                      {selected.justification}
                    </p>
                  </div>

                  <div className="space-y-2 pb-5">
                    <Label htmlFor="decision-comment" className="text-sm font-medium">
                      Commentaire de décision <span className="text-danger">*</span>
                    </Label>
                    <Textarea
                      id="decision-comment"
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Expliquez la décision pour traçabilité…"
                    />
                  </div>

                  <div className="mt-auto flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
                    <Button variant="destructive" onClick={() => onDecide("REJECTED")}>
                      <XCircle className="h-4 w-4" />
                      Rejeter la demande
                    </Button>
                    <Button
                      onClick={() => onDecide("APPROVED")}
                      className="bg-success text-success-foreground hover:bg-success/90"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approuver la demande
                    </Button>
                  </div>
                </section>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 2 : batch validation ── */}
        <TabsContent value="batch-validation" className="mt-0">
          <section className="cnss-card p-6">
            <h2 className="mb-1 text-lg font-semibold text-foreground">Validation en lot</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Sélectionnez plusieurs demandes et appliquez une décision collective (approbation ou rejet).
            </p>
            <BatchValidationPanel />
          </section>
        </TabsContent>
      </Tabs>

      {/* Confirm dialog */}
      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "APPROVED" ? "Confirmer l'approbation" : "Confirmer le rejet"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "APPROVED"
                ? "L'habilitation sera enregistrée et un évènement d'audit sera créé."
                : "La demande sera rejetée. Un évènement d'audit sera créé."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDecision}
              className={cn(
                confirm === "APPROVED"
                  ? "bg-success text-success-foreground hover:bg-success/90"
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
            >
              {confirm === "APPROVED" ? "Confirmer l'approbation" : "Confirmer le rejet"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
