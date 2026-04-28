import { cn } from "@/lib/utils";

interface CnssLogoProps {
  className?: string;
  variant?: "light" | "dark";
}

export function CnssLogo({ className, variant = "dark" }: CnssLogoProps) {
  const fg = variant === "light" ? "text-white" : "text-cnss-primary";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src="/CNSS-logo.png"
        alt="Logo CNSS"
        className="h-14 w-auto object-contain"
      />
      <div className={cn("flex flex-col leading-tight", fg)}>
        <span className="text-sm font-bold tracking-wide">CNSS</span>
        <span className={cn("text-[10px] font-medium uppercase tracking-wider", variant === "light" ? "text-white/70" : "text-muted-foreground")}>
          Habilitations
        </span>
      </div>
    </div>
  );
}
