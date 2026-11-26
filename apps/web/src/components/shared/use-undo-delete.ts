"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const UNDO_MS = 5000;

interface Pending { timer: ReturnType<typeof setTimeout>; toastId: string | number; commit: () => Promise<void> }

/**
 * Delete without a confirm dialog: the row is hidden at once and a toast offers Undo for 5s.
 * The real delete runs when the window closes; pending deletes are flushed immediately when
 * the page is hidden/unloaded or the component unmounts. Hide rows whose id is in `hiddenIds`.
 */
export function useUndoDelete(remove: (id: string) => Promise<{ success: boolean; error?: string }>) {
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(new Set());
  const pending = useRef(new Map<string, Pending>());
  const removeRef = useRef(remove);
  useEffect(() => { removeRef.current = remove; });

  const setHidden = useCallback((id: string, hidden: boolean) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (hidden) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const flush = useCallback(() => {
    for (const [id, p] of [...pending.current]) {
      clearTimeout(p.timer);
      pending.current.delete(id);
      toast.dismiss(p.toastId);
      void p.commit();
    }
  }, []);

  const requestDelete = useCallback((id: string, label: string) => {
    if (pending.current.has(id)) return;
    setHidden(id, true);
    const commit = async () => {
      try {
        const r = await removeRef.current(id);
        if (!r.success) { setHidden(id, false); toast.error(r.error ?? "Failed to delete"); }
      } catch {
        setHidden(id, false);
        toast.error("Failed to delete");
      }
    };
    const timer = setTimeout(() => { pending.current.delete(id); void commit(); }, UNDO_MS);
    const toastId = toast(`${label} deleted`, {
      duration: UNDO_MS,
      action: {
        label: "Undo",
        onClick: () => {
          const p = pending.current.get(id);
          if (!p) return;
          clearTimeout(p.timer);
          pending.current.delete(id);
          setHidden(id, false);
        },
      },
    });
    pending.current.set(id, { timer, toastId, commit });
  }, [setHidden]);

  useEffect(() => {
    const onHide = () => flush();
    const onVisibility = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("beforeunload", onHide);
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", onHide);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, [flush]);

  return { hiddenIds, requestDelete };
}
