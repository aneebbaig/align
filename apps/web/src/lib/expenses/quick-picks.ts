// Pure helpers behind the "quick picks" on the add form: repeated entries,
// most-used categories, and description autocomplete.

export interface PickRow {
  description: string;
  categoryId: string;
  amount: number;
  fundingSource?: string;
  fundingPotId?: string | null;
  fundingCurrencyId?: string | null;
}

export interface RepeatPick {
  description: string;
  categoryId: string;
  count: number;
  lastAmount: number;
  fundingSource?: "INCOME" | "SAVINGS_POT";
  fundingPotId?: string | null;
  fundingCurrencyId?: string | null;
}

const keyOf = (r: PickRow) => `${r.categoryId}\u0000${r.description.trim().toLowerCase()}`;

/** `rows` must be newest first. Top (description, category) pairs seen at least twice. */
export function rankRepeats(rows: PickRow[], limit = 6): RepeatPick[] {
  const map = new Map<string, RepeatPick & { firstIdx: number }>();
  rows.forEach((r, idx) => {
    const description = r.description.trim();
    if (!description) return;
    const k = keyOf(r);
    const cur = map.get(k);
    if (cur) { cur.count += 1; return; }
    const single = r.fundingSource === "INCOME" || (r.fundingSource === "SAVINGS_POT" && r.fundingPotId && r.fundingCurrencyId);
    map.set(k, {
      description, categoryId: r.categoryId, count: 1, lastAmount: r.amount, firstIdx: idx,
      ...(single ? { fundingSource: r.fundingSource as "INCOME" | "SAVINGS_POT", fundingPotId: r.fundingPotId ?? null, fundingCurrencyId: r.fundingCurrencyId ?? null } : {}),
    });
  });
  return [...map.values()]
    .filter((p) => p.count >= 2)
    .sort((a, b) => b.count - a.count || a.firstIdx - b.firstIdx)
    .slice(0, limit)
    .map(({ firstIdx: _f, ...p }) => p);
}

/** `rows` newest first. Category ids by use count, most used first (ties: most recent). */
export function topCategoryIds(rows: { categoryId: string }[], limit = 6): string[] {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.categoryId, (counts.get(r.categoryId) ?? 0) + 1);
  return [...counts.entries()]
    .map(([id, n], i) => ({ id, n, i }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.id);
}

export interface DescriptionPick { description: string; categoryId: string }

/** `rows` newest first. Distinct descriptions (case-insensitive) with their most recent category. */
export function recentDescriptions(rows: { description: string; categoryId: string }[], limit = 200): DescriptionPick[] {
  const seen = new Set<string>();
  const out: DescriptionPick[] = [];
  for (const r of rows) {
    const d = r.description.trim();
    if (!d) continue;
    const k = d.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ description: d, categoryId: r.categoryId });
    if (out.length >= limit) break;
  }
  return out;
}

/** Prefix matches first, then contains; case-insensitive; excludes an exact match of the query. */
export function matchDescriptions(list: DescriptionPick[], query: string, limit = 6): DescriptionPick[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts: DescriptionPick[] = [];
  const contains: DescriptionPick[] = [];
  for (const d of list) {
    const l = d.description.toLowerCase();
    if (l === q) continue;
    if (l.startsWith(q)) starts.push(d);
    else if (l.includes(q)) contains.push(d);
  }
  return [...starts, ...contains].slice(0, limit);
}
