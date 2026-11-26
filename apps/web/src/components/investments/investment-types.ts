import { Landmark, TrendingUp, Gem, Bitcoin, PiggyBank, Layers } from "lucide-react";

export interface Contribution {
  id: string;
  type: string; // "DEPOSIT" | "WITHDRAWAL"
  amount: number;
  date: Date;
  notes: string | null;
  transactionId: string | null;
}

export interface Investment {
  id: string;
  name: string;
  type: string;
  platform: string;
  investedAmount: number;
  currentValue: number;
  units: number | null;
  purchaseDate: Date;
  lastUpdated: Date;
  notes: string | null;
  customFields?: string | null;
  planCategoryId: string | null;
  contributions: Contribution[];
}

export interface PlanCategory {
  id: string;
  name: string;
  investmentType: string | null;
  percentage: number;
}

export interface CustomFields {
  // Mutual fund
  fundHouse?: string;
  nav?: string;
  folioNumber?: string;
  mfUnits?: string;
  // Stocks
  ticker?: string;
  shares?: string;
  exchange?: string;
  pricePerShare?: string;
  // Gold
  weightGrams?: string;
  purity?: string;
  storageLocation?: string;
  // Fixed deposit
  bank?: string;
  interestRate?: string;
  maturityDate?: string;
}

export const TYPES = [
  { value: "MUTUAL_FUND", label: "Mutual Fund" },
  { value: "STOCKS", label: "Stocks" },
  { value: "GOLD", label: "Gold" },
  { value: "CRYPTO", label: "Crypto" },
  { value: "FIXED_DEPOSIT", label: "Fixed Deposit" },
  { value: "OTHER", label: "Other" },
];

// Monochrome icon per type instead of a colored badge chip — keeps the
// emerald accent meaningful (gain/loss only) instead of diluted across a
// rainbow of pastel tags.
export const TYPE_ICON: Record<string, typeof Landmark> = {
  MUTUAL_FUND: Landmark,
  STOCKS: TrendingUp,
  GOLD: Gem,
  CRYPTO: Bitcoin,
  FIXED_DEPOSIT: PiggyBank,
  OTHER: Layers,
};

export function parseCustomFields(raw: string | null): CustomFields {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export interface PeriodRef { month: number; year: number }

export const BLANK_ADD_FORM = { name: "", type: "MUTUAL_FUND", percentage: "0" };

// One row in the "Invested Savings" list: either a plan category (funded or
// not yet) or a legacy Investment with no category link at all.
export type Row =
  | { kind: "category"; category: PlanCategory; investment: Investment | null }
  | { kind: "uncategorized"; investment: Investment };

export interface ContributeTarget {
  mode: "DEPOSIT" | "WITHDRAWAL";
  categoryId?: string;
  investmentId?: string;
  name: string;
  currentValue?: number;
}
