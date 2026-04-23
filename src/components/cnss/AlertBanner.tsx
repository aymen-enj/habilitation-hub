import { Info, AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "info" | "warning" | "danger" | "success";

interface AlertBannerProps {
  tone?: Tone;
  title?: string;
  children: ReactNode;
  className?: string;
}

const TONE: Record<Tone, { wrap: string; icon: typeof Info }> = {
  info: { wrap: "bg-cnss-accent-soft border-cnss-accent/30 text-cnss-primary-dark", icon: Info },
  warning: { wrap: "bg-warning-soft border-warning/30 text-warning", icon: AlertTriangle },
  danger: { wrap: "bg-danger-soft border-danger/30 text-danger", icon: ShieldAlert },
  success: { wrap: "bg-success-soft border-success/30 text-success", icon: CheckCircle2 },
};

export function AlertBanner({ tone = "info", title, children, className }: AlertBannerProps) {
  const cfg = TONE[tone];
  const Icon = cfg.icon;
  return (
    <div
      role="status"
      className={cn("flex items-start gap-3 rounded-xl border px-4 py-3 text-sm", cfg.wrap, className)}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="space-y-0.5">
        {title && <p className="font-semibold">{title}</p>}
        <div className="text-foreground/80">{children}</div>
      </div>
    </div>
  );
}
