import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppWindow, ArrowRight, Layers3, Users, UserCheck } from "lucide-react";
import { useDemo } from "@/state/DemoState";
import { PageHeader } from "@/components/cnss/PageHeader";
import { StatCard } from "@/components/cnss/StatCard";
import { ROLE_LABEL, canAccess, type RouteKey } from "@/lib/access";
import { cn } from "@/lib/utils";

// Forme des données retournées par GET /api/dashboard/stats
interface DashboardStats {
  nbAgentsTotal: number;
  nbAgentsActifs: number;
  nbApplications: number;
  nbProfils: number;
}

interface QuickAction {
  route: RouteKey;
  to: string;
  title: string;
  description: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { route: "agents", to: "/agents", title: "Consulter les agents", description: "Parcourir les agents et leurs habilitations actives." },
  { route: "profileAssignments", to: "/affectations-profils", title: "Affecter des profils", description: "Attribuer ou suspendre des profils directement, ou traiter un lot Excel." },
  { route: "consultation", to: "/consultation", title: "Consulter les habilitations", description: "Filtrer et analyser les habilitations existantes." },
  { route: "parameters", to: "/parameters", title: "Paramétrer les référentiels", description: "Configurer applications, profils et autorisations." },
  { route: "audit", to: "/audit", title: "Consulter l'audit", description: "Examiner la chronologie des évènements importants." },
];

export default function Dashboard() {
  const { session } = useDemo();
  const navigate = useNavigate();
  const user = session!.user;

  // Récupérer les infos réelles de l'agent stockées après le login
  const agentInfo = JSON.parse(localStorage.getItem("cnss_agent") ?? "null");
  const prenom = agentInfo?.prenom ?? user.name.split(" ")[0];
  const poste  = agentInfo?.poste  ?? null;

  // Appel réel vers GET /api/dashboard/stats
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_URL}/dashboard/stats`).then((r) => r.json()),
  });

  const visibleActions = QUICK_ACTIONS.filter((a) => canAccess(a.route, user.role));

  return (
    <div className="cnss-page space-y-8">
      <PageHeader
        title={`Bonjour, ${prenom}`}
        subtitle={
          poste
            ? `Poste : ${poste} — Voici un aperçu de l'activité des habilitations.`
            : `Rôle : ${ROLE_LABEL[user.role]} — Voici un aperçu de l'activité des habilitations.`
        }
      />

      <section aria-labelledby="kpi-title" className="space-y-4">
        <h2 id="kpi-title" className="sr-only">Indicateurs clés</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Agents totaux"  value={isLoading ? "…" : stats?.nbAgentsTotal}   icon={Users}      tone="default" />
          <StatCard label="Agents actifs"  value={isLoading ? "…" : stats?.nbAgentsActifs}  icon={UserCheck}  tone="success" />
          <StatCard label="Applications"   value={isLoading ? "…" : stats?.nbApplications}  icon={AppWindow}  tone="accent"  />
          <StatCard label="Profils"        value={isLoading ? "…" : stats?.nbProfils}        icon={Layers3}    tone="warning" />
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

    </div>
  );
}
