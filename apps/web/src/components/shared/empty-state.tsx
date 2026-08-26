import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
    >
      <div className="mb-5 relative">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <Icon className="h-6 w-6 text-muted-foreground/75" />
        </div>
        <div className="absolute inset-0 rounded-2xl ring-1 ring-border" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground/70 max-w-xs leading-relaxed">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} size="sm" className="mt-6">
          {action.label}
        </Button>
      )}
    </div>
  );
}
