import { cn } from "@/lib/utils";

interface PageHeaderProps {
  section?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ section, title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-8", className)}>
      <div>
        {section && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 mb-1.5">
            {section}
          </p>
        )}
        <h1 className="text-[28px] font-bold tracking-tight text-foreground leading-none font-display">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-lg">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 pt-0.5">{action}</div>}
    </div>
  );
}
