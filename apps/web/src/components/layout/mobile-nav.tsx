"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, ArrowDownUp, PiggyBank, ListTodo,
  Calendar, Gift, Settings, TrendingUp, CalendarDays, Wallet,
  HandCoins, ShoppingCart, LineChart, MoreHorizontal, X,
  FlaskConical, ClipboardList, FolderKanban,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIMARY_NAV = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: ArrowDownUp },
  { href: "/budget", label: "Budget", icon: PiggyBank },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
];

const MORE_GROUPS = [
  {
    label: "Money",
    items: [
      { href: "/income", label: "Income", icon: TrendingUp },
      { href: "/savings", label: "Savings", icon: Wallet },
      { href: "/investments", label: "Invest", icon: LineChart },
      { href: "/loans", label: "Loans", icon: HandCoins },
    ],
  },
  {
    label: "Planning",
    items: [
      { href: "/plans", label: "Plans", icon: CalendarDays },
      { href: "/want-list", label: "Want List", icon: ShoppingCart },
      { href: "/need-list", label: "Need List", icon: ClipboardList },
      { href: "/calendar", label: "Calendar", icon: Calendar },
    ],
  },
  {
    label: "Other",
    items: [
      { href: "/projects", label: "Work", icon: FolderKanban },
      { href: "/perfumes", label: "Perfumes", icon: FlaskConical },
      { href: "/vault", label: "Vault", icon: Gift },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function MobileNav({ role }: { role?: string }) {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);
  const isSuperAdmin = role === "SUPER_ADMIN";

  const visibleGroups = MORE_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(({ href }) => href !== "/vault" || isSuperAdmin),
  })).filter((group) => group.items.length > 0);

  const isMoreActive = visibleGroups
    .flatMap((g) => g.items)
    .some((item) => pathname === item.href || pathname.startsWith(item.href + "/"));

  return (
    <>
      {showMore && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setShowMore(false)}>
          <div
            className="absolute bottom-16 left-0 right-0 bg-background border-t border-border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                All Sections
              </span>
              <button
                onClick={() => setShowMore(false)}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3 space-y-4 max-h-[60vh] overflow-y-auto">
              {visibleGroups.map((group) => (
                <div key={group.label}>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/75 px-1 mb-2">
                    {group.label}
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {group.items.map(({ href, label, icon: Icon }) => {
                      const active =
                        pathname === href || pathname.startsWith(href + "/");
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setShowMore(false)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl text-[11px] font-medium transition-colors",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-center leading-tight">{label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border flex items-center justify-around h-16 px-1">
        {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 min-w-[44px] py-2 px-2 rounded-lg text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-[18px] w-[18px]", active && "text-primary")} />
              <span>{label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setShowMore((v) => !v)}
          className={cn(
            "flex flex-col items-center gap-1 min-w-[44px] py-2 px-2 rounded-lg text-[11px] font-medium transition-colors",
            showMore || isMoreActive ? "text-primary" : "text-muted-foreground"
          )}
        >
          <MoreHorizontal
            className={cn(
              "h-[18px] w-[18px]",
              (showMore || isMoreActive) && "text-primary"
            )}
          />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
