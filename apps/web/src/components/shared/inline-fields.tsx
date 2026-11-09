"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { evaluateAmount } from "@/lib/amount-expr";

const SAVE_DELAY_MS = 700;

/**
 * A text field that edits in place: typing saves itself after a short pause
 * (and immediately on blur). It follows outside changes only while untouched,
 * so a refresh never overwrites what's being typed.
 */
export function InlineText({ value, onSave, className, placeholder, ariaLabel }: {
  value: string; onSave: (v: string) => void; className?: string; placeholder?: string; ariaLabel: string;
}) {
  const [text, setText] = useState(value);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ text, onSave });
  useEffect(() => { latest.current = { text, onSave }; });

  useEffect(() => { if (!dirty.current) setText(value); }, [value]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function flush() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (!dirty.current) return;
    dirty.current = false;
    const v = latest.current.text.trim();
    if (v && v !== value) latest.current.onSave(v);
    else if (!v) setText(value);
  }
  return (
    <input
      aria-label={ariaLabel}
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        dirty.current = true;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(flush, SAVE_DELAY_MS);
      }}
      onBlur={flush}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className={cn("bg-transparent rounded px-1.5 -mx-1.5 py-0.5 outline-none border border-transparent hover:border-border focus:border-primary focus:bg-background transition-colors", className)}
    />
  );
}

/** Like InlineText for money: accepts a number or a sum ("35+67"). `null` = empty. */
export function InlineAmount({ label, symbol, valuePaisas, optional, disabled, hint, onSave }: {
  label: string; symbol: string; valuePaisas: number | null; optional?: boolean;
  /** Shown but not editable (e.g. an estimate that follows a chosen quote). */
  disabled?: boolean; hint?: string;
  onSave: (majorOrNull: number | null) => void;
}) {
  const fmt = (p: number | null) => (p === null ? "" : String(p / 100));
  const [text, setText] = useState(fmt(valuePaisas));
  const [invalid, setInvalid] = useState(false);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ text, onSave, valuePaisas });
  useEffect(() => { latest.current = { text, onSave, valuePaisas }; });

  useEffect(() => { if (!dirty.current) { setText(fmt(valuePaisas)); setInvalid(false); } }, [valuePaisas]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function flush() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (!dirty.current) return;
    const raw = latest.current.text.trim();
    let next: number | null;
    if (raw === "") {
      if (!optional) { setInvalid(false); next = 0; } else next = null;
    } else if (/^0+(\.0*)?$/.test(raw)) {
      next = 0;
    } else {
      const r = evaluateAmount(raw);
      if (!r.ok) { setInvalid(true); return; } // keep what they typed; nothing is saved until it's valid
      next = r.value;
    }
    setInvalid(false);
    dirty.current = false;
    const nextPaisas = next === null ? null : Math.round(next * 100);
    if (nextPaisas !== latest.current.valuePaisas) latest.current.onSave(next);
  }
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground" title={hint}>
      <span className="shrink-0 w-11">{label}</span>
      <span className={cn("flex items-center gap-1 rounded-md border px-2 h-7 w-32 bg-background focus-within:border-primary", invalid ? "border-destructive" : "border-border", disabled && "bg-muted/50")}>
        <span className="shrink-0 text-muted-foreground/70">{symbol}</span>
        <input
          aria-label={label}
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          value={text}
          placeholder={optional ? "not yet" : "0"}
          onChange={(e) => {
            setText(e.target.value);
            dirty.current = true;
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(flush, SAVE_DELAY_MS);
          }}
          onBlur={flush}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="w-full min-w-0 bg-transparent outline-none text-sm font-medium text-foreground tabular-nums placeholder:text-muted-foreground/40 placeholder:font-normal"
        />
      </span>
    </label>
  );
}

