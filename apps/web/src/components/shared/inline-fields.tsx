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
      className={cn("bg-transparent rounded px-1.5 -mx-1.5 py-0.5 outline-none ring-1 ring-inset ring-transparent hover:ring-border focus:ring-primary focus:bg-background transition-colors", className)}
    />
  );
}

/**
 * A title that reads as plain text; clicking it turns it into an input.
 * Enter or blur saves, Esc cancels, empty is rejected (reverts). Clicks never
 * bubble, so it is safe inside a link or a clickable card.
 */
export function EditableTitle({ value, onSave, className, ariaLabel }: {
  value: string; onSave: (v: string) => void; className?: string; ariaLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const done = useRef(false);

  function finish(save: boolean) {
    if (done.current) return;
    done.current = true;
    setEditing(false);
    const v = text.trim();
    if (save && v && v !== value) onSave(v);
  }

  if (!editing) {
    return (
      <button
        type="button"
        aria-label={`Edit ${ariaLabel}`}
        title="Click to rename"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); done.current = false; setText(value); setEditing(true); }}
        className={cn("block max-w-full truncate text-left rounded px-1.5 -mx-1.5 hover:bg-muted/60 transition-colors", className)}
      >
        {value}
      </button>
    );
  }
  return (
    <input
      autoFocus
      aria-label={ariaLabel}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") { e.preventDefault(); finish(true); }
        else if (e.key === "Escape") { e.preventDefault(); finish(false); }
      }}
      className={cn("w-full min-w-0 bg-background rounded px-1.5 -mx-1.5 py-0 outline-none ring-1 ring-inset ring-primary", className)}
    />
  );
}

/** Like InlineText for money: accepts a number or a sum ("35+67"). `null` = empty. */
export function InlineAmount({ label, symbol, valuePaisas, optional, disabled, hint, variant = "labeled", onSave }: {
  label: string; symbol: string; valuePaisas: number | null; optional?: boolean;
  /**
   * "bare": no visible label or symbol, right-aligned - for money columns under a shared header.
   * "boxed": the same, but drawn as an input (border and background at rest) so it reads as editable.
   */
  variant?: "labeled" | "bare" | "boxed";
  /** Shown but not editable (e.g. an estimate that follows a chosen quote). */
  disabled?: boolean; hint?: string;
  onSave: (majorOrNull: number | null) => void;
}) {
  // Editing shows the plain number; at rest it's grouped ("400,000"), and zero shows as empty.
  const fmt = (p: number | null) => (p === null || p === 0 ? "" : String(p / 100));
  const display = (p: number | null) => (p === null || p === 0 ? "" : (p / 100).toLocaleString(undefined, { maximumFractionDigits: 2 }));
  const [text, setText] = useState(fmt(valuePaisas));
  const [focused, setFocused] = useState(false);

  const [invalid, setInvalid] = useState(false);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line react-hooks/refs -- dirty only changes alongside a re-rendering setText
  const shown = focused || invalid || dirty.current ? text : display(valuePaisas);
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
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY_MS);
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); };

  if (variant === "bare" || variant === "boxed") {
    const boxed = variant === "boxed";
    return (
      <div title={hint} className={cn("rounded-md ring-1 ring-inset px-2 h-8 w-full flex items-center transition-colors focus-within:ring-primary focus-within:bg-background",
        invalid ? "ring-destructive" : boxed ? "ring-input bg-background hover:ring-foreground/30" : "ring-transparent hover:ring-border",
        disabled && (boxed ? "bg-muted/50 opacity-80" : "opacity-70"))}>
        <input
          aria-label={label}
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          value={shown}
          onFocus={() => setFocused(true)}
          placeholder="—"
          onChange={onChange}
          onBlur={() => { setFocused(false); flush(); }}
          onKeyDown={onKeyDown}
          className="w-full min-w-0 bg-transparent outline-none text-sm font-medium text-foreground text-right tabular-nums whitespace-nowrap placeholder:text-muted-foreground/40 placeholder:font-normal"
        />
      </div>
    );
  }

  return (
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground" title={hint}>
      <span className="shrink-0 w-11">{label}</span>
      <span className={cn("flex items-center gap-1 rounded-md ring-1 ring-inset px-2 h-7 w-32 bg-background focus-within:ring-primary", invalid ? "ring-destructive" : "ring-border", disabled && "bg-muted/50")}>
        <span className="shrink-0 text-muted-foreground/70">{symbol}</span>
        <input
          aria-label={label}
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          value={shown}
          onFocus={() => setFocused(true)}
          placeholder={optional ? "not yet" : "0"}
          onChange={(e) => {
            setText(e.target.value);
            dirty.current = true;
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(flush, SAVE_DELAY_MS);
          }}
          onBlur={() => { setFocused(false); flush(); }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="w-full min-w-0 bg-transparent outline-none text-sm font-medium text-foreground tabular-nums placeholder:text-muted-foreground/40 placeholder:font-normal"
        />
      </span>
    </label>
  );
}

