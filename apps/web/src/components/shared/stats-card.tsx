import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: { value: number; label: string };
  className?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-muted-foreground",
  trend,
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "group bg-card border border-border rounded-xl p-5 flex flex-col gap-3",
        "hover:border-border/60 transition-all duration-200",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">
          {title}
        </span>
        <div className={cn("shrink-0 opacity-50 group-hover:opacity-80 transition-opacity", iconColor)}>
          <Icon className="h-[15px] w-[15px]" />
        </div>
      </div>

      <div className="space-y-0.5">
        <div className="text-2xl font-bold text-foreground tabnum leading-none">
          {value}
        </div>
        {subtitle && (
          <div className="text-xs text-muted-foreground/75">{subtitle}</div>
        )}
      </div>

      {trend && (
        <div
          className={cn(
            "inline-flex items-center gap-1 text-xs font-semibold",
            trend.value >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-500 dark:text-red-400"
          )}
        >
          <span className={cn(
            "inline-block w-1.5 h-1.5 rounded-full",
            trend.value >= 0 ? "bg-emerald-500" : "bg-red-500"
          )} />
          {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
        </div>
      )}
    </div>
  );
}
