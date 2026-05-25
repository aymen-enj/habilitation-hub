import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDemo } from "@/state/DemoState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/cnss/FormField";
import { CnssLogo } from "@/components/cnss/CnssLogo";
import { ScrollText, Search, Settings2, Users } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useDemo();
  const [identifiant, setIdentifiant] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifiant?: string; password?: string; api?: string }>({});

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!identifiant.trim()) next.identifiant = "Identifiant requis.";
    if (!password.trim()) next.password = "Mot de passe requis.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      // Appel réel au backend Spring Boot
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: identifiant.trim(), motPasse: password }),
      });

      if (!res.ok) {
        const msg = await res.text();
        setErrors({ api: msg || "Identifiant ou mot de passe incorrect." });
        return;
      }

      const data = await res.json();

      // Stocker les infos réelles de l'agent (nom, prenom, poste) en localStorage
      localStorage.setItem("cnss_agent", JSON.stringify({
        codeAgent: data.codeAgent,
        nom: data.nom,
        prenom: data.prenom,
        poste: data.poste,
      }));

      // ADMIN par défaut pour la navigation (le vrai rôle viendra de la DB plus tard)
      login(identifiant.trim(), "ADMIN");
      toast.success(`Bienvenue, ${data.prenom ?? data.nom} !`);
      navigate("/", { replace: true });
    } catch {
      setErrors({ api: "Impossible de contacter le serveur." });
    } finally {
      setLoading(false);
    }
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
          © {new Date().getFullYear()} Caisse Nationale de Sécurité Sociale.
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
              Entrez votre identifiant et votre mot de passe pour accéder à la plateforme.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <FormField id="identifiant" label="Identifiant" required error={errors.identifiant}>
              <Input
                id="identifiant"
                type="text"
                autoComplete="username"
                placeholder="ex : DE050"
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
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

            {errors.api && (
              <p className="text-sm font-medium text-destructive">{errors.api}</p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Connexion en cours…" : "Se connecter"}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
