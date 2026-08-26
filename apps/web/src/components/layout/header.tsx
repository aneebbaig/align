"use client";

import { Moon, Sun, LogOut, Settings, Loader2, Palette, Type } from "lucide-react";
import { useState } from "react";
import { useTheme } from "next-themes";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/layout/notification-bell";
import { useColorTheme, type ColorTheme } from "@/components/shared/color-theme-provider";
import { useFontTheme, FONT_PAIRS } from "@/components/shared/font-theme-provider";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import type { AppNotification } from "@/actions/notifications";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":     "Dashboard",
  "/expenses":      "Expenses",
  "/income":        "Income",
  "/budget":        "Budget",
  "/savings":       "Savings",
  "/investments":   "Investments",
  "/loans":         "Loans",
  "/plans":       "Plans",
  "/want-list":     "Want List",
  "/need-list":     "Need List",
  "/tasks":         "Tasks",
  "/calendar":      "Calendar",
  "/vault":         "Vault",
  "/perfumes":      "Perfumes",
  "/settings":      "Settings",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  for (const [key, val] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(key + "/")) return val;
  }
  return "";
}

const THEMES: { id: ColorTheme; label: string; swatch: string }[] = [
  { id: "warm",   label: "Warm",   swatch: "oklch(0.72 0.09 75)"  },
  { id: "carbon", label: "Carbon", swatch: "oklch(0.55 0.10 255)" },
  { id: "dusk",   label: "Dusk",   swatch: "oklch(0.52 0.13 285)" },
  { id: "moss",   label: "Moss",   swatch: "oklch(0.48 0.13 150)" },
  { id: "rose",   label: "Rose",   swatch: "oklch(0.55 0.12 350)" },
];

interface HeaderProps {
  user: { name?: string | null; email?: string | null; id?: string };
  notifications: AppNotification[];
}

export function Header({ user, notifications }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();
  const { fontTheme, setFontTheme } = useFontTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);

  const initials =
    user.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "U";

  const pageTitle = getPageTitle(pathname);

  async function handleSignOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 md:px-5 shrink-0">
      {/* Page title */}
      <div className="flex items-center">
        {pageTitle && (
          <span className="text-sm font-semibold text-foreground/80 tracking-tight">
            {pageTitle}
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <NotificationBell notifications={notifications} />

        {/* Theme color picker */}
        <Popover open={paletteOpen} onOpenChange={setPaletteOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Choose color theme"
            >
              <Palette className="h-[15px] w-[15px]" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-3">
              Color Theme
            </p>
            <div className="flex items-center gap-2.5">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setColorTheme(t.id);
                    setPaletteOpen(false);
                  }}
                  title={t.label}
                  className={cn(
                    "group flex flex-col items-center gap-1.5 transition-all",
                  )}
                >
                  <span
                    className={cn(
                      "w-7 h-7 rounded-full transition-all block",
                      colorTheme === t.id
                        ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110"
                        : "hover:scale-110 opacity-70 hover:opacity-100"
                    )}
                    style={{ background: t.swatch }}
                  />
                  <span className={cn(
                    "text-[9px] uppercase tracking-wide leading-none",
                    colorTheme === t.id
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground/75"
                  )}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Font picker */}
        <Popover open={fontOpen} onOpenChange={setFontOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Choose font"
            >
              <Type className="h-[15px] w-[15px]" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-3">
              Font Pair
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FONT_PAIRS.map((pair) => (
                <button
                  key={pair.id}
                  onClick={() => { setFontTheme(pair.id); setFontOpen(false); }}
                  className={cn(
                    "text-left px-3 py-2.5 rounded-lg border transition-all",
                    fontTheme === pair.id
                      ? "border-foreground bg-accent ring-1 ring-foreground/20"
                      : "border-border hover:bg-accent hover:border-border/80"
                  )}
                >
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1.5 leading-none">
                    {pair.label}
                  </p>
                  <p
                    className="text-base font-bold leading-none mb-0.5"
                    style={{ fontFamily: `var(${pair.displayVar})` }}
                  >
                    Ag
                  </p>
                  <p
                    className="text-[11px] text-muted-foreground leading-none tabnum"
                    style={{ fontFamily: `var(${pair.sansVar})` }}
                  >
                    1,234.56
                  </p>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Light / dark toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Sun className="h-[15px] w-[15px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[15px] w-[15px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-8 w-8 rounded-full hover:ring-2 hover:ring-border transition-all"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-muted text-foreground/70 text-xs font-semibold border border-border">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-muted-foreground font-normal">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <LogOut className="mr-2 h-4 w-4" />
              }
              {signingOut ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
