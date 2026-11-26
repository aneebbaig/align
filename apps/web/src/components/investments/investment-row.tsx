"use client";

import { format } from "date-fns";
import { Plus, RefreshCw, Trash2, ChevronDown, ChevronUp, MoreHorizontal, Eraser, Minus, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { investmentGain, withdrawnTotal } from "@/lib/investment-math";
import { cn } from "@/lib/utils";
import { CustomFieldsSummary } from "./custom-fields";
import { TYPES, TYPE_ICON, parseCustomFields, type ContributeTarget, type Investment, type Row } from "./investment-types";

export interface DeleteTarget { investmentId?: string; categoryId?: string; name: string }

export function InvestmentRow({ row, baseSymbol, expanded, onToggle, onContribute, onEdit, onClear, onDelete, onDeleteContribution }: {
  row: Row;
  baseSymbol: string;
  expanded: boolean;
  onToggle: () => void;
  onContribute: (t: ContributeTarget) => void;
  onEdit: (inv: Investment) => void;
  onClear: (investmentId: string) => void;
  onDelete: (t: DeleteTarget) => void;
  onDeleteContribution: (id: string) => void;
}) {
  const inv = row.investment;
  const name = row.kind === "category" ? row.category.name : row.investment.name;
  const type = row.kind === "category" ? (row.category.investmentType ?? "OTHER") : row.investment.type;
  const withdrawn = inv ? withdrawnTotal(inv.contributions) : 0;
  const { gain, gainPct: gainPctNum } = inv ? investmentGain(inv, withdrawn) : { gain: 0, gainPct: 0 };
  const gainPct = gainPctNum.toFixed(1);
  const TypeIcon = TYPE_ICON[type] ?? Layers;
  const typeLabel = TYPES.find((t) => t.value === type)?.label ?? type;
  const hasCustomFields = inv ? Object.keys(parseCustomFields(inv.customFields ?? null)).length > 0 : false;
  return (
      <div className="px-5 py-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <TypeIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground leading-tight">{name}</span>
              {row.kind === "uncategorized" && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal">Uncategorized</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {inv
                ? <>{typeLabel} · {baseSymbol} {(inv.investedAmount / 100).toLocaleString()} invested{withdrawn > 0 && <> · {baseSymbol} {(withdrawn / 100).toLocaleString()} withdrawn</>}</>
                : <>{typeLabel} · No money added yet</>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-bold text-foreground tabnum leading-tight">{baseSymbol} {((inv?.currentValue ?? 0) / 100).toLocaleString()}</div>
            {inv && (
              <div className={cn("text-xs font-medium tabnum mt-0.5", gain >= 0 ? "text-emerald-500" : "text-red-500")}>
                {gain >= 0 ? "+" : ""}{baseSymbol} {(gain / 100).toLocaleString()} · {gain >= 0 ? "+" : ""}{gainPct}%
              </div>
            )}
          </div>
        </div>

        {inv && (inv.notes || hasCustomFields) && (
          <div className="mt-2 pl-[3.125rem] space-y-1">
            <CustomFieldsSummary type={inv.type} raw={inv.customFields ?? null} baseSymbol={baseSymbol} />
            {inv.notes && <div className="text-xs text-muted-foreground italic">{inv.notes}</div>}
          </div>
        )}

        <div className="flex items-center gap-1 mt-3 pl-[3.125rem]">
          <Button
            size="sm"
            onClick={() => onContribute(
              row.kind === "category"
                ? { mode: "DEPOSIT", categoryId: row.category.id, investmentId: inv?.id, name }
                : { mode: "DEPOSIT", investmentId: row.investment.id, name },
            )}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add money
          </Button>
          {inv && inv.currentValue > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onContribute({ mode: "WITHDRAWAL", investmentId: inv.id, name, currentValue: inv.currentValue })}
            >
              <Minus className="h-3.5 w-3.5 mr-1" />
              Withdraw
            </Button>
          )}
          {inv && inv.contributions.length > 0 && (
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={onToggle}>
              {expanded ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
              History
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground" aria-label="More actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {inv && (
                <DropdownMenuItem onClick={() => onEdit(inv)}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Update value
                </DropdownMenuItem>
              )}
              {inv && row.kind === "category" && (
                <DropdownMenuItem onClick={() => onClear(inv.id)}>
                  <Eraser className="h-3.5 w-3.5" />
                  Clear money &amp; history
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(row.kind === "category"
                  ? { categoryId: row.category.id, name }
                  : { investmentId: row.investment.id, name })}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete investment
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {expanded && inv && (
          <div className="mt-3 ml-[3.125rem] border-l border-border">
            {inv.contributions.map((c) => (
              <div key={c.id} className="group/entry relative flex items-center justify-between gap-2 pl-4 py-1.5 text-xs">
                <span className="absolute -left-[3.5px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-muted-foreground/40" />
                <div className="min-w-0 flex items-baseline gap-2">
                  <span className={cn("tabnum font-medium", c.type === "WITHDRAWAL" ? "text-red-500" : "text-foreground")}>
                    {c.type === "WITHDRAWAL" ? "−" : "+"}{baseSymbol} {(c.amount / 100).toLocaleString()}
                  </span>
                  {c.transactionId && (
                    <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                      {c.type === "WITHDRAWAL" ? "in Income" : "in Expenses"}
                    </Badge>
                  )}
                  {c.notes && <span className="text-muted-foreground truncate">{c.notes}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-muted-foreground tabnum">{format(c.date, "dd MMM yyyy")}</span>
                  <button
                    onClick={() => onDeleteContribution(c.id)}
                    className="text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover/entry:opacity-100"
                    aria-label="Delete entry"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  );
}
