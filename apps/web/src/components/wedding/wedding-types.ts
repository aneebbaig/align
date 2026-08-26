export interface WeddingEvent {
  id: string;
  weddingPlanId: string;
  type: string;
  name: string;
  date: Date | null;
  venue: string | null;
  guestCount: number | null;
  budgetAllocated: number;
  notes: string | null;
  status: string;
  responsibleParty: string;
  order: number;
}

export interface WeddingVendor {
  id: string;
  weddingPlanId: string;
  eventId: string | null;       // null = general vendor (spans whole wedding)
  category: string;
  name: string;
  phone: string | null;
  instagram: string | null;
  quotedAmount: number;
  finalAmount: number | null;
  depositPaid: number | null;
  paymentStatus: string;
  isSelected: boolean;
  notes: string | null;
  createdAt: Date;
}

export interface CurrencyLite {
  id: string;
  code: string;
  symbol: string;
  rateToBase: number;
  isBase: boolean;
}

export interface WeddingExpense {
  id: string;
  weddingPlanId: string;
  eventId: string | null;
  name: string;
  category: string;
  // Priority-ordered funding sources (max 2)
  source1CurrencyId: string;
  source1Currency: CurrencyLite;
  source1Amount: number;        // estimated - smallest unit of source1Currency
  source1Paid: number | null;   // actual paid
  source2CurrencyId: string | null;
  source2Currency: CurrencyLite | null;
  source2Amount: number | null;
  source2Paid: number | null;
  isPaid: boolean;
  notes: string | null;
  createdAt: Date;
}

export interface WeddingPlan {
  id: string;
  brideName: string;
  groomName: string;
  weddingDate: Date | null;
  totalBudget: number;
  haqMehr: number | null;
  haqMehrNote: string | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  events: WeddingEvent[];
  vendors: WeddingVendor[];
  expenses: WeddingExpense[];
}

export const EVENT_TYPES = [
  { value: "DHOLKI",   label: "Dholki",    order: 1, emoji: "🥁" },
  { value: "MAYUN",    label: "Mayun",     order: 2, emoji: "🌼" },
  { value: "MEHNDI",   label: "Mehndi",    order: 3, emoji: "🌿" },
  { value: "NIKKAH",   label: "Nikkah",    order: 4, emoji: "📜" },
  { value: "BARAT",    label: "Barat",     order: 5, emoji: "🐴" },
  { value: "RUKHSATI", label: "Rukhsati",  order: 6, emoji: "🕊️" },
  { value: "VALIMA",   label: "Valima",    order: 7, emoji: "🎊" },
  { value: "OTHER",    label: "Other",     order: 8, emoji: "📌" },
] as const;

export const VENDOR_CATEGORIES = [
  { value: "VENUE",          label: "Venue" },
  { value: "CATERING",       label: "Catering" },
  { value: "PHOTOGRAPHY",    label: "Photography" },
  { value: "VIDEOGRAPHY",    label: "Videography" },
  { value: "DECOR",          label: "Décor & Flowers" },
  { value: "MAKEUP",         label: "Makeup Artist" },
  { value: "MEHNDI_ARTIST",  label: "Mehndi Artist" },
  { value: "MUSIC_DJ",       label: "Music & DJ" },
  { value: "TRANSPORT",      label: "Transport" },
  { value: "OUTFITS_BRIDE",  label: "Bride's Outfits" },
  { value: "OUTFITS_GROOM",  label: "Groom's Outfits" },
  { value: "JEWELRY",        label: "Jewelry" },
  { value: "INVITATION",     label: "Invitations" },
  { value: "DHOLAK",         label: "Dholak Players" },
  { value: "HORSE",          label: "Horse / Carriage" },
  { value: "OTHER",          label: "Other" },
] as const;

export const EXPENSE_CATEGORIES = [
  { value: "DRESS",          label: "Dresses & Clothes" },
  { value: "JEWELRY",        label: "Jewelry" },
  { value: "DECOR",          label: "Décor & Props" },
  { value: "FLOWERS",        label: "Flowers" },
  { value: "FIREWORKS",      label: "Fireworks" },
  { value: "TRANSPORT",      label: "Transport" },
  { value: "FOOD",           label: "Food & Refreshments" },
  { value: "ENTERTAINMENT",  label: "Entertainment" },
  { value: "PRINTING",       label: "Printing & Cards" },
  { value: "GIFTS",          label: "Gifts & Favours" },
  { value: "BEAUTY",         label: "Beauty & Grooming" },
  { value: "HONEYMOON",      label: "Honeymoon" },
  { value: "MISC",           label: "Miscellaneous" },
] as const;

export const PAYMENT_STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  UNPAID:       { label: "Unpaid",        badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  DEPOSIT_PAID: { label: "Deposit Paid",  badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  FULLY_PAID:   { label: "Fully Paid",    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  CANCELLED:    { label: "Cancelled",     badge: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
};

export const EVENT_STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  PLANNED:   { label: "Planned",   badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  CONFIRMED: { label: "Confirmed", badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  DONE:      { label: "Done",      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
};

export const PLAN_STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  PLANNING:    { label: "Planning",     badge: "bg-blue-100 text-blue-700" },
  IN_PROGRESS: { label: "In Progress",  badge: "bg-amber-100 text-amber-700" },
  DONE:        { label: "Done",         badge: "bg-emerald-100 text-emerald-700" },
};

export function fmt(n: number, symbol = "Rs") {
  return symbol + " " + (n / 100).toLocaleString("en-PK", { minimumFractionDigits: 0 });
}

export function fmtUsd(cents: number, symbol = "$") {
  return symbol + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function fmtSource(currency: CurrencyLite, amount: number) {
  return fmt(amount, currency.symbol);
}

export function getEventInfo(type: string) {
  return EVENT_TYPES.find((e) => e.value === type) ?? EVENT_TYPES[EVENT_TYPES.length - 1];
}

export function getCategoryLabel(value: string) {
  return VENDOR_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function getExpenseCategoryLabel(value: string) {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
