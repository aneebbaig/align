// Menu sections a login can hide (personal, per login). Expenses and Settings
// are always shown. Keys are shared with the phone app - do not rename.
export const SECTIONS = [
  { key: "dashboard", label: "Dashboard", hrefs: ["/dashboard"] },
  { key: "income", label: "Income", hrefs: ["/income"] },
  { key: "budget", label: "Budget", hrefs: ["/budget"] },
  { key: "savings", label: "Savings", hrefs: ["/savings"] },
  { key: "investments", label: "Investments", hrefs: ["/investments"] },
  { key: "loans", label: "Loans", hrefs: ["/loans"] },
  { key: "forecast", label: "Forecast", hrefs: ["/forecast"] },
  { key: "plans", label: "Plans", hrefs: ["/plans"] },
  { key: "lists", label: "Lists", hrefs: ["/lists", "/want-list", "/need-list"] },
  { key: "tasks", label: "Tasks", hrefs: ["/tasks"] },
  { key: "routines", label: "Routines", hrefs: ["/routines"] },
  { key: "work", label: "Work", hrefs: ["/projects"] },
  { key: "calendar", label: "Calendar", hrefs: ["/calendar"] },
  { key: "vault", label: "Vault", hrefs: ["/vault"] },
  { key: "perfumes", label: "Perfumes", hrefs: ["/perfumes"] },
] as const;

export const SECTION_KEYS: string[] = SECTIONS.map((s) => s.key);

/** Validates a hiddenSections value: every entry must be a known key. Returns the deduped list (in menu order), or null when invalid. */
export function parseHiddenSections(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  if (!input.every((k) => typeof k === "string" && SECTION_KEYS.includes(k))) return null;
  const set = new Set<string>(input as string[]);
  return SECTION_KEYS.filter((k) => set.has(k));
}

/** True when a nav href belongs to a hidden section. */
export function isHrefHidden(href: string, hidden: readonly string[]): boolean {
  if (hidden.length === 0) return false;
  return SECTIONS.some((s) => hidden.includes(s.key) && (s.hrefs as readonly string[]).includes(href));
}
