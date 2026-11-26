import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function toPaisas(amount: number): number {
  return Math.round(amount * 100);
}

// Local midnight of the date's calendar day. Accepts "yyyy-MM-dd" (web forms)
// and ISO datetimes like "2026-09-30T14:23:11.123" (the mobile app) - only the
// date part is used.
export function toLocalDate(dateStr: string): Date {
  return new Date(dateStr.slice(0, 10) + "T00:00:00");
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getMonthName(month: number): string {
  return new Date(2024, month - 1, 1).toLocaleString("default", { month: "long" });
}

export function isOverdue(date: Date | null | undefined): boolean {
  if (!date) return false;
  return new Date(date) < new Date(new Date().setHours(0, 0, 0, 0));
}

export function getDaysUntil(date: Date | null | undefined): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
