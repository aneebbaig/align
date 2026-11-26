"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SheetSection } from "./expense-row";

/** The open expense lives in the URL (?expense=<id>&section=quotes) so links and refreshes keep it. */
export function useExpenseSheet() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function set(id: string | null, section?: SheetSection) {
    const next = new URLSearchParams(params.toString());
    if (id) next.set("expense", id); else next.delete("expense");
    if (id && section) next.set("section", section); else next.delete("section");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }
  const section = params.get("section");
  return {
    openId: params.get("expense"),
    section: section === "quotes" || section === "payment" ? (section as SheetSection) : undefined,
    open: (id: string, section?: SheetSection) => set(id, section),
    close: () => set(null),
  };
}
