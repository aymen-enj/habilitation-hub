import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserCheck, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { useDemo } from "@/state/DemoState";
import { PageHeader } from "@/components/cnss/PageHeader";
import { StatCard } from "@/components/cnss/StatCard";
import { Button } from "@/components/ui/button";
import { ROLE_LABEL, canAccess, type RouteKey } from "@/lib/access";
import { cn } from "@/lib/utils";

interface QuickAction {
  route: RouteKey;
  to: string;
  title: string;
  description: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { route: "agents", to: "/agents", title: "Consulter les agents", description: "Parcourir les agents et leurs habilitations actives." },
  { route: "requests", to: "/access-requests", title: "Créer une demande", description: "Soumettre une nouvelle demande d'accès au nom d'un agent." },
  { route: "validation", to: "/validation", title: "Traiter la file de validation", description: "Approuver ou rejeter les demandes en attente." },
  { route: "audit", to: "/audit", title: "Consulter l'audit", description: "Examiner la chronologie des évènements importants." },
];

export default function Dashboard() {
  const { session, agents, requests } = useDemo();
  const navigate = useNavigate();
  const user = session!.user;

  const stats = useMemo(() => {
    const totalAgents = agents.length;
    const activeAgents = agents.filter((a) => a.status === "ACTIF").length;
    const pending = requests.filter((r) => r.status === "PENDING").length;
    const approved = requests.filter((r) => r.status === "APPROVED").length;
    return { totalAgents, activeAgents, pending, approved };
  }, [agents, requests]);

  const visibleActions = QUICK_ACTIONS.filter((a) => canAccess(a.route, user.role));

  return (
    <div className="cnss-page space-y-8">
      <PageHeader
        title={`Bonjour, ${user.name.split(" ")[0]}`}
        subtitle={`Rôle : ${ROLE_LABEL[user.role]} — Voici un aperçu de l'activité des habilitations.`}
      />

      <section aria-labelledby="kpi-title" className="space-y-4">
        <h2 id="kpi-title" className="sr-only">Indicateurs clés</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Agents totaux" value={stats.totalAgents} icon={Users} tone="default" />
          <StatCard label="Agents actifs" value={stats.activeAgents} icon={UserCheck} tone="success" />
          <StatCard label="Demandes en attente" value={stats.pending} icon={Clock} tone="warning" hint="À traiter par le validateur" />
          <StatCard label="Demandes approuvées" value={stats.approved} icon={CheckCircle2} tone="accent" />
        </div>
      </section>

      <section aria-labelledby="actions-title" className="space-y-4">
        <h2 id="actions-title" className="text-lg font-semibold text-foreground">Actions rapides</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleActions.map((a) => (
            <button
              key={a.route}
              type="button"
              onClick={() => navigate(a.to)}
              className={cn(
                "cnss-card group flex h-full flex-col items-start gap-2 p-5 text-left transition-all",
                "hover:-translate-y-0.5 hover:border-cnss-accent/50 hover:shadow-md",
              )}
            >
              <span className="text-base font-semibold text-foreground">{a.title}</span>
              <span className="flex-1 text-sm text-muted-foreground">{a.description}</span>
              <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-cnss-primary group-hover:text-cnss-primary-dark">
                Ouvrir
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="apps-title" className="space-y-3">
        <h2 id="apps-title" className="text-lg font-semibold text-foreground">Applications couvertes</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "RH", count: 2 },
            { label: "Finance", count: 2 },
            { label: "IT", count: 1 },
          ].map((d) => (
            <span
              key={d.label}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm font-medium text-foreground shadow-sm"
            >
              <span className="h-2 w-2 rounded-full bg-cnss-accent" aria-hidden="true" />
              {d.label}
              <span className="text-xs text-muted-foreground">({d.count} apps)</span>
            </span>
          ))}
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Mode démonstration — les données affichées sont fictives et réinitialisées à chaque rechargement.
      </p>
    </div>
  );
}
