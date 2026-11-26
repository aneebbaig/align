export type EntryType = "EXPENSE" | "INCOME";

const key = (type: EntryType) => `align:lastCategory:${type}`;

/** The category id last used for a new entry of this type (per browser), or null. */
export function readLastCategory(type: EntryType): string | null {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key(type)) || null : null;
  } catch {
    return null;
  }
}

export function rememberCategory(type: EntryType, categoryId: string) {
  try { window.localStorage.setItem(key(type), categoryId); } catch { /* storage unavailable */ }
}
