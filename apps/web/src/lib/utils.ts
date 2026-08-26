import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function toPaisas(amount: number): number {
  return Math.round(amount * 100);
}

export function toLocalDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "PKR"): string {
  // amount is in smallest unit (paisas), convert to main unit
  const value = amount / 100;
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function parseCurrencyInput(value: string): number {
  // Parse user input string to paisas integer
  const clean = value.replace(/[^0-9.]/g, "");
  const float = parseFloat(clean) || 0;
  return Math.round(float * 100);
}

export function formatAmount(paisas: number): string {
  return (paisas / 100).toFixed(2);
}

export function getMonthName(month: number): string {
  return new Date(2024, month - 1, 1).toLocaleString("default", { month: "long" });
}

export function getCurrentMonth() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
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

export function getProgressColor(percentage: number): string {
  if (percentage >= 100) return "bg-red-500";
  if (percentage >= 75) return "bg-amber-500";
  return "bg-emerald-500";
}

export function getProgressColorClass(percentage: number): string {
  if (percentage >= 100) return "text-red-500";
  if (percentage >= 75) return "text-amber-500";
  return "text-emerald-500";
}
