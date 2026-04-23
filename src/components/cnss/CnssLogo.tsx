import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface CnssLogoProps {
  className?: string;
  variant?: "light" | "dark";
}

export function CnssLogo({ className, variant = "dark" }: CnssLogoProps) {
  const fg = variant === "light" ? "text-white" : "text-cnss-primary";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-cnss-accent text-cnss-primary-dark shadow-sm")}>
        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className={cn("flex flex-col leading-tight", fg)}>
        <span className="text-sm font-bold tracking-wide">CNSS</span>
        <span className={cn("text-[10px] font-medium uppercase tracking-wider", variant === "light" ? "text-white/70" : "text-muted-foreground")}>
          Habilitations
        </span>
      </div>
    </div>
  );
}
