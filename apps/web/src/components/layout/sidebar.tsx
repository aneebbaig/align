"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ArrowDownUp, PiggyBank, CalendarDays,
  ListTodo, Calendar, Gift, Settings, TrendingUp, Wallet, HandCoins,
  ChevronLeft, ChevronRight, LineChart, Heart,
  FlaskConical, ClipboardList, FolderKanban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AlignLogo } from "@/components/shared/align-logo";
import { APP_NAME } from "@/lib/brand";
import { useState } from "react";

const NAV_GROUPS = [
  {
    label: "Money Flow",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/expenses", label: "Expenses", icon: ArrowDownUp },
      { href: "/income", label: "Income", icon: TrendingUp },
      { href: "/budget", label: "Budget", icon: PiggyBank },
    ],
  },
  {
    label: "Savings & Wealth",
    items: [
      { href: "/savings", label: "Savings", icon: Wallet },
      { href: "/investments", label: "Investments", icon: LineChart },
      { href: "/loans", label: "Loans", icon: HandCoins },
    ],
  },
  {
    label: "Planning",
    items: [
      { href: "/plans", label: "Plans", icon: CalendarDays },
      { href: "/wedding", label: "Wedding", icon: Heart },
      { href: "/lists", label: "Lists", icon: ClipboardList },
    ],
  },
  {
    label: "Life",
    items: [
      { href: "/tasks", label: "Tasks", icon: ListTodo },
      { href: "/projects", label: "Work", icon: FolderKanban },
      { href: "/calendar", label: "Calendar", icon: Calendar },
      { href: "/vault", label: "Vault", icon: Gift },
      { href: "/perfumes", label: "Perfumes", icon: FlaskConical },
    ],
  },
];

export function Sidebar({ role }: { role?: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const isSuperAdmin = role === "SUPER_ADMIN";

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out",
        collapsed ? "w-14" : "w-60"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-14 px-4 border-b border-sidebar-border shrink-0",
        collapsed && "justify-center px-0"
      )}>
        <AlignLogo size={collapsed ? 26 : 28} />
        {!collapsed && (
          <span className="ml-2.5 font-semibold text-sidebar-foreground tracking-tight text-[14px]">
            {APP_NAME}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45 px-5 py-1.5">
                {group.label}
              </div>
            )}
            {collapsed && <div className="my-1 mx-2 border-b border-sidebar-border" />}
            <div>
              {group.items
                .filter(({ href }) => href !== "/vault" || isSuperAdmin)
                .map(({ href, label, icon: Icon }) => {
                  const active =
                    pathname === href ||
                    pathname.startsWith(href + "/");
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={collapsed ? label : undefined}
                      className={cn(
                        "relative flex items-center gap-3 py-[7px] pr-3 text-[13px] font-medium transition-colors duration-150",
                        collapsed
                          ? cn(
                              "justify-center w-10 h-10 mx-auto rounded-lg my-0.5",
                              active
                                ? "bg-primary/15 text-primary"
                                : "text-sidebar-foreground/55 hover:text-sidebar-foreground/85 hover:bg-sidebar-accent"
                            )
                          : cn(
                              "pl-5",
                              active
                                ? "text-primary bg-primary/8 before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-[22px] before:w-[2px] before:bg-primary before:rounded-r-full"
                                : "text-sidebar-foreground/50 hover:text-sidebar-foreground/85 hover:bg-sidebar-accent"
                            )
                      )}
                    >
                      <Icon className="h-[15px] w-[15px] shrink-0" />
                      {!collapsed && <span>{label}</span>}
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}

        {/* Settings */}
        <div className="mt-2">
          {!collapsed && (
            <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45 px-5 py-1.5">
              System
            </div>
          )}
          <Link
            href="/settings"
            title={collapsed ? "Settings" : undefined}
            className={cn(
              "relative flex items-center gap-3 py-[7px] pr-3 text-[13px] font-medium transition-colors duration-150",
              collapsed
                ? cn(
                    "justify-center w-10 h-10 mx-auto rounded-lg",
                    pathname === "/settings"
                      ? "bg-primary/15 text-primary"
                      : "text-sidebar-foreground/55 hover:text-sidebar-foreground/85 hover:bg-sidebar-accent"
                  )
                : cn(
                    "pl-5",
                    pathname === "/settings"
                      ? "text-primary bg-primary/8 before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-[22px] before:w-[2px] before:bg-primary before:rounded-r-full"
                      : "text-sidebar-foreground/50 hover:text-sidebar-foreground/85 hover:bg-sidebar-accent"
                  )
            )}
          >
            <Settings className="h-[15px] w-[15px] shrink-0" />
            {!collapsed && <span>Settings</span>}
          </Link>
        </div>
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 border-t border-sidebar-border text-sidebar-foreground/35 hover:text-sidebar-foreground/65 hover:bg-sidebar-accent transition-colors shrink-0"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed
          ? <ChevronRight className="h-[13px] w-[13px]" />
          : <ChevronLeft className="h-[13px] w-[13px]" />
        }
      </button>
    </aside>
  );
}
