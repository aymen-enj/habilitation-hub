import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDemo } from "@/state/DemoState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/cnss/FormField";
import { CnssLogo } from "@/components/cnss/CnssLogo";
import { ROLE_LABEL } from "@/lib/access";
import type { Role } from "@/mocks/types";
import { ScrollText, Search, Settings2, Users } from "lucide-react";
import { toast } from "sonner";

const ROLES: Role[] = ["ADMIN", "MANAGER", "VALIDATOR", "AUDIT_VIEWER"];

const ROLE_HINT: Record<Role, string> = {
  ADMIN: "Accès complet à toutes les pages.",
  MANAGER: "Tableau de bord, agents et consultation des habilitations.",
  VALIDATOR: "Tableau de bord, agents, consultation et audit.",
  AUDIT_VIEWER: "Lecture seule du tableau de bord, des agents, de la consultation et de l'audit.",
};

export default function Login() {
  const navigate = useNavigate();
  const { login } = useDemo();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("ADMIN");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Adresse e-mail requise.";
    if (!password.trim()) next.password = "Mot de passe requis.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    login(email.trim(), role);
    toast.success(`Connexion réussie — rôle ${ROLE_LABEL[role]} (mode démo).`);
    navigate("/", { replace: true });
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-cnss-primary-dark lg:flex lg:flex-col lg:justify-between lg:p-10 lg:text-primary-foreground">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(60% 60% at 80% 20%, hsl(var(--cnss-accent) / 0.5) 0%, transparent 60%), radial-gradient(40% 40% at 10% 90%, hsl(var(--cnss-accent) / 0.35) 0%, transparent 60%)",
          }}
        />
        <div className="relative">
          <div className="inline-flex rounded-lg bg-white p-3">
            <img
              src="/CNSS-logo.png"
              alt="Logo CNSS"
              className="h-16 w-auto object-contain"
            />
          </div>
        </div>
        <div className="relative max-w-md space-y-6">
          <h2 className="text-3xl font-semibold leading-tight">
            Plateforme de gestion des habilitations
          </h2>
          <p className="text-base text-primary-foreground/80">
            Pilotez les droits d'accès des agents avec rigueur, traçabilité et conformité — au cœur du système d'information de la CNSS.
          </p>
          <ul className="space-y-3 text-sm">
            {[
              { Icon: Users, label: "Gestion centralisée des agents et des délégations" },
              { Icon: Search, label: "Consultation des habilitations existantes" },
              { Icon: Settings2, label: "Paramétrage des référentiels applicatifs" },
              { Icon: ScrollText, label: "Journal d'audit immuable" },
            ].map(({ Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cnss-accent/20 text-cnss-accent">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-primary-foreground/90">{label}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} Caisse Nationale de Sécurité Sociale — Mode démonstration.
        </p>
      </aside>

      {/* Form panel */}
      <section className="flex items-center justify-center px-6 py-10 md:px-10">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 lg:hidden">
            <CnssLogo />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Connexion</h1>
            <p className="text-sm text-muted-foreground">
              Entrez vos identifiants et choisissez le rôle pour cette session de démonstration.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <FormField id="email" label="Adresse e-mail" required error={errors.email}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="prenom.nom@cnss.ma"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>

            <FormField id="password" label="Mot de passe" required error={errors.password}>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormField>

            <FormField id="role" label="Rôle de la session" hint={ROLE_HINT[role]} required>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <Button type="submit" className="w-full" size="lg">
              Se connecter
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Mode démonstration — toute combinaison e-mail / mot de passe non vide est acceptée.
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
