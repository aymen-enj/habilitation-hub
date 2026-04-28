import { type FormEvent, useMemo, useState } from "react";
import { useDemo } from "@/state/DemoState";
import { PageHeader } from "@/components/cnss/PageHeader";
import { FormField } from "@/components/cnss/FormField";
import { AlertBanner } from "@/components/cnss/AlertBanner";
import { StatusBadge } from "@/components/cnss/StatusBadge";
import { EmptyState } from "@/components/cnss/EmptyState";
import { BatchAddPanel } from "@/components/cnss/BatchAddPanel";
import { BatchRemoveRequestPanel } from "@/components/cnss/BatchRemoveRequestPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { canAccess } from "@/lib/access";
import { cn } from "@/lib/utils";
import { formatDate, formatRelative } from "@/lib/format";
import { toast } from "sonner";
import { Send, UserPlus, ShieldOff, FileText } from "lucide-react";

interface FormState {
  beneficiaryId: string;
  applicationId: string;
  profileId: string;
  moduleId: string;
  startDate: string;
  endDate: string;
  justification: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function AccessRequests() {
  const { session, agents, applications, profiles, modules, requests, users, createRequest } =
    useDemo();
  const role = session!.user.role;
  const canCreate = canAccess("requests", role);

  const [form, setForm] = useState<FormState>({
    beneficiaryId: "",
    applicationId: "",
    profileId: "",
    moduleId: "",
    startDate: today(),
    endDate: "",
    justification: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const profilesForApp = useMemo(
    () => profiles.filter((p) => p.applicationId === form.applicationId),
    [profiles, form.applicationId],
  );
  const modulesForProfile = useMemo(
    () => modules.filter((m) => m.profileId === form.profileId),
    [modules, form.profileId],
  );

  const visibleRequests = useMemo(() => {
    if (role === "ADMIN") return requests;
    if (role === "MANAGER")
      return requests.filter(
        (r) => r.requesterId === session!.user.id || r.requesterId === "u-mgr",
      );
    return requests;
  }, [requests, role, session]);

  const sortedVisible = useMemo(
    () => [...visibleRequests].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [visibleRequests],
  );

  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!form.beneficiaryId) next.beneficiaryId = "Sélectionnez un bénéficiaire.";
    if (!form.applicationId) next.applicationId = "Sélectionnez une application.";
    if (!form.profileId) next.profileId = "Sélectionnez un profil.";
    if (!form.moduleId) next.moduleId = "Sélectionnez un module.";
    if (!form.startDate) next.startDate = "Date de début requise.";
    if (!form.endDate) next.endDate = "Date de fin requise.";
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      next.endDate = "La date de fin doit être postérieure à la date de début.";
    }
    if (!form.justification.trim() || form.justification.trim().length < 10) {
      next.justification = "Justification trop courte (10 caractères minimum).";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canCreate) return;
    if (!validate()) return;
    createRequest({
      beneficiaryId: form.beneficiaryId,
      applicationId: form.applicationId,
      profileId: form.profileId,
      moduleId: form.moduleId,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      justification: form.justification.trim(),
      operation: "ADD"
    });
    toast.success("Demande créée avec succès (mode démo).");
    setForm({
      beneficiaryId: "",
      applicationId: "",
      profileId: "",
      moduleId: "",
      startDate: today(),
      endDate: "",
      justification: "",
    });
    setErrors({});
  };

  const beneficiaryName = (id: string) => {
    const a = agents.find((x) => x.id === id);
    return a ? `${a.firstName} ${a.lastName}` : "—";
  };
  const appName = (id: string) => applications.find((a) => a.id === id)?.name ?? "—";
  const requesterName = (id: string) => users.find((u) => u.id === id)?.name ?? id;

  // Compter les demandes par type
  const addCount = sortedVisible.filter((r) => r.operation === "ADD").length;
  const removeCount = sortedVisible.filter((r) => r.operation === "REMOVE").length;

  return (
    <div className="cnss-page space-y-6">
      <PageHeader
        title="Demandes d'accès"
        subtitle="Soumettez et suivez les demandes d'habilitation pour les agents."
      />

      {!canCreate && (
        <AlertBanner tone="info" title="Mode consultation">
          Ce rôle est en consultation uniquement. Vous pouvez consulter les demandes mais pas en
          créer.
        </AlertBanner>
      )}

      <Tabs defaultValue="individual" className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-muted/60 sm:w-auto sm:inline-grid">
          <TabsTrigger value="individual" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Demande individuelle</span>
            <span className="sm:hidden">Individuel</span>
          </TabsTrigger>
          <TabsTrigger value="batch-add" className="gap-2">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Ajout en lot</span>
            <span className="sm:hidden">Lot +</span>
          </TabsTrigger>
          <TabsTrigger value="batch-remove" className="gap-2">
            <ShieldOff className="h-4 w-4" />
            <span className="hidden sm:inline">Retrait en lot</span>
            <span className="sm:hidden">Lot −</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1 : Demande individuelle ── */}
        <TabsContent value="individual" className="mt-0">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {/* Form */}
            <section aria-labelledby="form-title" className="cnss-card p-6">
              <h2 id="form-title" className="mb-1 text-lg font-semibold text-foreground">
                Nouvelle demande
              </h2>
              <p className="mb-5 text-sm text-muted-foreground">
                Renseignez les informations ci-dessous. Les champs marqués d'une étoile sont
                obligatoires.
              </p>

              <fieldset disabled={!canCreate} className="contents">
                <form onSubmit={onSubmit} className="space-y-5" noValidate>
                  <FormField
                    id="beneficiary"
                    label="Bénéficiaire"
                    required
                    error={errors.beneficiaryId}
                  >
                    <Select
                      value={form.beneficiaryId}
                      onValueChange={(v) => update({ beneficiaryId: v })}
                    >
                      <SelectTrigger id="beneficiary">
                        <SelectValue placeholder="Sélectionner un agent…" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.firstName} {a.lastName} · {a.matricule}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>

                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField id="app" label="Application" required error={errors.applicationId}>
                      <Select
                        value={form.applicationId}
                        onValueChange={(v) =>
                          update({ applicationId: v, profileId: "", moduleId: "" })
                        }
                      >
                        <SelectTrigger id="app">
                          <SelectValue placeholder="Choisir…" />
                        </SelectTrigger>
                        <SelectContent>
                          {applications.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField id="profile" label="Profil" required error={errors.profileId}>
                      <Select
                        value={form.profileId}
                        onValueChange={(v) => update({ profileId: v, moduleId: "" })}
                        disabled={!form.applicationId}
                      >
                        <SelectTrigger id="profile">
                          <SelectValue
                            placeholder={form.applicationId ? "Choisir…" : "Application requise"}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {profilesForApp.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField id="module" label="Module" required error={errors.moduleId}>
                      <Select
                        value={form.moduleId}
                        onValueChange={(v) => update({ moduleId: v })}
                        disabled={!form.profileId}
                      >
                        <SelectTrigger id="module">
                          <SelectValue
                            placeholder={form.profileId ? "Choisir…" : "Profil requis"}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {modulesForProfile.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField id="start" label="Date de début" required error={errors.startDate}>
                      <Input
                        id="start"
                        type="date"
                        value={form.startDate}
                        onChange={(e) => update({ startDate: e.target.value })}
                      />
                    </FormField>
                    <FormField id="end" label="Date de fin" required error={errors.endDate}>
                      <Input
                        id="end"
                        type="date"
                        value={form.endDate}
                        onChange={(e) => update({ endDate: e.target.value })}
                      />
                    </FormField>
                  </div>

                  <FormField
                    id="justification"
                    label="Justification"
                    required
                    hint="Expliquez le besoin métier de cette habilitation."
                    error={errors.justification}
                  >
                    <Textarea
                      id="justification"
                      rows={4}
                      value={form.justification}
                      onChange={(e) => update({ justification: e.target.value })}
                      placeholder="Ex. : Renfort équipe pour la clôture trimestrielle."
                    />
                  </FormField>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button type="submit" size="lg" disabled={!canCreate}>
                      <Send className="h-4 w-4" />
                      Soumettre la demande
                    </Button>
                  </div>
                </form>
              </fieldset>
            </section>

            {/* List */}
            <section aria-labelledby="list-title" className="cnss-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 id="list-title" className="text-lg font-semibold text-foreground">
                  Mes demandes visibles
                </h2>
                <span className="text-xs text-muted-foreground">
                  {sortedVisible.length} élément(s)
                </span>
              </div>

              {sortedVisible.length === 0 ? (
                <EmptyState
                  title="Aucune demande à afficher"
                  description="Les demandes que vous créez apparaîtront ici."
                />
              ) : (
                <ul className="space-y-3">
                  {sortedVisible.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                              r.operation === "ADD" 
                                ? "bg-success-soft text-success" 
                                : "bg-warning-soft text-warning"
                            )}>
                              {r.operation === "ADD" ? "AJOUT" : "RETRAIT"}
                            </span>
                            <p className="truncate text-sm font-semibold text-foreground">
                              {beneficiaryName(r.beneficiaryId)} — {appName(r.applicationId)}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Demandé par {requesterName(r.requesterId)} ·{" "}
                            {formatRelative(r.createdAt)}
                          </p>
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                        {r.justification}
                      </p>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Période : {formatDate(r.startDate)} → {formatDate(r.endDate)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </TabsContent>

        {/* ── Tab 2 : Ajout en lot ── */}
        <TabsContent value="batch-add" className="mt-0">
          <section className="cnss-card p-6">
            <h2 className="mb-1 text-lg font-semibold text-foreground">Demande d'ajout en lot</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Importez un fichier Excel pour soumettre plusieurs demandes d'ajout d'accès simultanément.
            </p>
            <BatchAddPanel />
          </section>
        </TabsContent>

        {/* ── Tab 3 : Retrait en lot ── */}
        <TabsContent value="batch-remove" className="mt-0">
          <section className="cnss-card p-6">
            <h2 className="mb-1 text-lg font-semibold text-foreground">Demande de retrait en lot</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Importez un fichier Excel pour soumettre plusieurs demandes de retrait d'accès simultanément.
            </p>
            <BatchRemoveRequestPanel />
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
