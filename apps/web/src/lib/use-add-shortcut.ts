"use client";

import { useEffect } from "react";

/** Press "n" (no modifiers, outside inputs, no dialog open) to run `onAdd`. */
export function useAddShortcut(dialogOpen: boolean, onAdd: () => void) {
  useEffect(() => {
    if (dialogOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "n" || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.repeat) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      e.preventDefault();
      // Open after this key event is fully handled, so the "n" never lands in the form's first field.
      setTimeout(onAdd, 0);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogOpen, onAdd]);
}
