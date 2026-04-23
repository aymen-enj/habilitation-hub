import { CheckCircle2, Clock, XCircle, AlertTriangle } from "lucide-react";
import type { RequestStatus } from "@/mocks/types";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  RequestStatus,
  { label: string; classes: string; Icon: typeof Clock }
> = {
  PENDING: {
    label: "En attente",
    classes: "bg-cnss-accent-soft text-cnss-primary-dark border-cnss-accent/30",
    Icon: Clock,
  },
  APPROVED: {
    label: "Approuvée",
    classes: "bg-success-soft text-success border-success/20",
    Icon: CheckCircle2,
  },
  REJECTED: {
    label: "Rejetée",
    classes: "bg-danger-soft text-danger border-danger/20",
    Icon: XCircle,
  },
  EXPIRED: {
    label: "Expirée",
    classes: "bg-muted text-muted-foreground border-border",
    Icon: AlertTriangle,
  },
};

interface StatusBadgeProps {
  status: RequestStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        cfg.classes,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {cfg.label}
    </span>
  );
}
