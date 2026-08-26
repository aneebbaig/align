"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { updateUserSettings, changePassword, createCategory, updateCategory, deleteCategory, exportUserData } from "@/actions/settings";
import { createCurrency, updateCurrency, setBaseCurrency, deleteCurrency } from "@/actions/currencies";
import { adminCreateUser, adminDeleteUser, adminUpdateUserRole, updateNotificationPreferences } from "@/actions/users";
import { TotpSettings } from "@/components/settings/totp-settings";
import { resetAppData } from "@/actions/reset";
import { RESET_GROUPS } from "@/lib/reset-groups";
import { Plus, Trash2, Download, RefreshCw, CheckCircle, XCircle, ShieldCheck, Shield, X, AlertTriangle, Pencil, Star, Coins } from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

interface UserSettings {
  name: string;
  email: string;
  dateFormat: string;
  firstDayOfWeek: number;
  emergencyFundMonths: number;
  cashflowHorizonMonths: number;
  cashflowLeadTimeDays: number;
  notifyBudgetWarning: boolean;
  notifyDoomSpending: boolean;
  notifyLoanDue: boolean;
  notifyDailyDigest: boolean;
  notifyDigestTasks: boolean;
  notifyDigestCalendar: boolean;
  notifyDigestBudget: boolean;
  notifyDigestFinancials: boolean;
}
interface Currency {
  id: string;
  code: string;
  symbol: string;
  rateToBase: number;
  isBase: boolean;
}
interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
  isDefault: boolean;
}
interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  recurringFrequency: string | null;
  date: Date;
  category: { name: string; color: string };
}
interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

const DATE_FORMATS = [
  { value: "dd/MM/yyyy", label: "DD/MM/YYYY (31/01/2025)" },
  { value: "MM/dd/yyyy", label: "MM/DD/YYYY (01/31/2025)" },
  { value: "yyyy-MM-dd", label: "YYYY-MM-DD (2025-01-31)" },
  { value: "dd MMM yyyy", label: "DD MMM YYYY (31 Jan 2025)" },
];

const WEEK_STARTS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 6, label: "Saturday" },
];

export function SettingsClient({
  settings,
  categories,
  currencies: initialCurrencies,
  recurringTransactions,
  users,
  role,
  emailConfigured,
}: {
  settings: UserSettings | null;
  categories: Category[];
  currencies: Currency[];
  recurringTransactions: RecurringTransaction[];
  users: AppUser[];
  role: string;
  emailConfigured: boolean;
}) {
  const isSuperAdmin = role === "SUPER_ADMIN";
  const [isPending, startTransition] = useTransition();

  // Profile state
  const [profile, setProfile] = useState({
    name: settings?.name ?? "",
    dateFormat: settings?.dateFormat ?? "dd/MM/yyyy",
    firstDayOfWeek: settings?.firstDayOfWeek ?? 1,
    emergencyFundMonths: settings?.emergencyFundMonths ?? 6,
    cashflowHorizonMonths: settings?.cashflowHorizonMonths ?? 8,
    cashflowLeadTimeDays: settings?.cashflowLeadTimeDays ?? 3,
  });

  // Currencies state
  const [currencies, setCurrencies] = useState(initialCurrencies);
  const [newCurrency, setNewCurrency] = useState({ code: "", symbol: "", rateToBase: "" });
  const [addingCurrency, setAddingCurrency] = useState(false);
  const [editingRates, setEditingRates] = useState<Record<string, string>>({});
  const [savingCurrencyId, setSavingCurrencyId] = useState<string | null>(null);

  // Password state
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

  // Categories state
  const [deleteCatData, setDeleteCatData] = useState<{ id: string; name: string; isDefault: boolean } | null>(null);
  const [newCat, setNewCat] = useState({ name: "", icon: "Tag", color: "#6366f1", type: "EXPENSE" });
  const [addingCat, setAddingCat] = useState(false);
  const [editCat, setEditCat] = useState<{ id: string; name: string; color: string } | null>(null);
  const [savingEditCat, setSavingEditCat] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState({
    notifyBudgetWarning: settings?.notifyBudgetWarning ?? true,
    notifyDoomSpending: settings?.notifyDoomSpending ?? true,
    notifyLoanDue: settings?.notifyLoanDue ?? true,
    notifyDailyDigest: settings?.notifyDailyDigest ?? true,
    notifyDigestTasks: settings?.notifyDigestTasks ?? true,
    notifyDigestCalendar: settings?.notifyDigestCalendar ?? true,
    notifyDigestBudget: settings?.notifyDigestBudget ?? true,
    notifyDigestFinancials: settings?.notifyDigestFinancials ?? true,
  });
  const [savingNotif, setSavingNotif] = useState(false);

  // Users state
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "ADMIN" });
  const [creatingUser, setCreatingUser] = useState(false);

  // Reset data state
  const [resetKeys, setResetKeys] = useState<Set<string>>(new Set());
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  // Bumped after a successful reset to force a fresh ConfirmDialog instance,
  // so the typed "DELETE" confirmation can't carry over to the next open.
  const [resetDialogKey, setResetDialogKey] = useState(0);

  function handleSaveProfile() {
    startTransition(async () => {
      const result = await updateUserSettings(profile);
      if (result.success) toast.success("Profile updated!");
      else toast.error(result.error ?? "Failed to save");
    });
  }

  function handleChangePassword() {
    if (passwords.new !== passwords.confirm) { toast.error("Passwords don't match"); return; }
    if (passwords.new.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    startTransition(async () => {
      const result = await changePassword({ currentPassword: passwords.current, newPassword: passwords.new });
      if (result.success) {
        toast.success("Password changed!");
        setPasswords({ current: "", new: "", confirm: "" });
      } else {
        toast.error(result.error ?? "Failed");
      }
    });
  }

  async function handleAddCategory() {
    if (!newCat.name) return;
    setAddingCat(true);
    const result = await createCategory(newCat);
    if (result.success) {
      toast.success("Category added!");
      setNewCat({ name: "", icon: "Tag", color: "#6366f1", type: "EXPENSE" });
    } else {
      toast.error(result.error ?? "Failed");
    }
    setAddingCat(false);
  }

  async function handleDeleteCategory(id: string) {
    const result = await deleteCategory(id);
    if (result.success) toast.success("Category deleted");
    else toast.error(result.error ?? "Failed to delete category");
    setDeleteCatData(null);
  }

  async function handleSaveEditCategory() {
    if (!editCat || !editCat.name.trim()) return;
    setSavingEditCat(true);
    const result = await updateCategory(editCat.id, { name: editCat.name.trim(), color: editCat.color });
    if (result.success) {
      toast.success("Category updated!");
      setEditCat(null);
    } else {
      toast.error(result.error ?? "Failed to update category");
    }
    setSavingEditCat(false);
  }

  async function handleAddCurrency() {
    const code = newCurrency.code.trim();
    const rate = parseFloat(newCurrency.rateToBase);
    if (!code || !rate || rate <= 0) return;
    setAddingCurrency(true);
    const result = await createCurrency({ code, symbol: newCurrency.symbol.trim() || code, rateToBase: rate });
    setAddingCurrency(false);
    if (result.success) {
      toast.success(`${code} added`);
      setNewCurrency({ code: "", symbol: "", rateToBase: "" });
      window.location.reload();
    } else {
      toast.error(result.error ?? "Failed to add currency");
    }
  }

  async function handleSaveCurrencyRate(id: string) {
    const raw = editingRates[id];
    const rate = parseFloat(raw);
    if (!rate || rate <= 0) return;
    setSavingCurrencyId(id);
    const result = await updateCurrency(id, { rateToBase: rate });
    setSavingCurrencyId(null);
    if (result.success) {
      toast.success("Exchange rate updated");
      setCurrencies((prev) => prev.map((c) => (c.id === id ? { ...c, rateToBase: rate } : c)));
      setEditingRates((prev) => { const next = { ...prev }; delete next[id]; return next; });
    } else {
      toast.error(result.error ?? "Failed to update rate");
    }
  }

  async function handleSetBaseCurrency(id: string) {
    const result = await setBaseCurrency(id);
    if (result.success) {
      toast.success("Base currency changed");
      window.location.reload();
    } else {
      toast.error(result.error ?? "Failed to change base currency");
    }
  }

  async function handleDeleteCurrency(id: string) {
    const result = await deleteCurrency(id);
    if (result.success) {
      toast.success("Currency removed");
      setCurrencies((prev) => prev.filter((c) => c.id !== id));
    } else {
      toast.error(result.error ?? "Failed to remove currency");
    }
  }

  async function handleExport() {
    startTransition(async () => {
      const result = await exportUserData();
      if (!result.success) { toast.error(result.error); return; }
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${APP_NAME.toLowerCase()}-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported!");
    });
  }

  async function handleSaveNotifications() {
    setSavingNotif(true);
    const result = await updateNotificationPreferences(notifications);
    if (result.success) toast.success("Notification preferences saved!");
    else toast.error(result.error ?? "Failed");
    setSavingNotif(false);
  }

  async function handleCreateUser() {
    if (!newUser.name || !newUser.email || !newUser.password) return;
    setCreatingUser(true);
    const result = await adminCreateUser(newUser);
    if (result.success) {
      toast.success(`${newUser.name} added!`);
      setNewUser({ name: "", email: "", password: "", role: "ADMIN" });
    } else {
      toast.error(result.error ?? "Failed");
    }
    setCreatingUser(false);
  }

  async function handleDeleteUser() {
    if (!deleteUserId) return;
    const result = await adminDeleteUser(deleteUserId);
    if (result.success) toast.success("User deleted");
    else toast.error(result.error ?? "Failed");
    setDeleteUserId(null);
  }

  async function handleToggleRole(userId: string, currentRole: string) {
    const newRole = currentRole === "SUPER_ADMIN" ? "ADMIN" : "SUPER_ADMIN";
    const result = await adminUpdateUserRole(userId, newRole);
    if (result.success) toast.success("Role updated");
    else toast.error(result.error ?? "Failed");
  }

  function toggleResetKey(key: string) {
    setResetKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function handleResetData() {
    setResetting(true);
    const result = await resetAppData([...resetKeys]);
    setResetting(false);
    setResetDialogOpen(false);
    setResetDialogKey((k) => k + 1);
    if (result.success) {
      const total = Object.entries(result.data ?? {})
        .filter(([k]) => k !== "categoriesHidden")
        .reduce((sum, [, v]) => sum + v, 0);
      toast.success(`Reset complete - ${total} record${total === 1 ? "" : "s"} deleted`);
      setResetKeys(new Set());
    } else {
      toast.error(result.error ?? "Failed to reset data");
    }
  }

  const customCategories = categories.filter((c) => !c.isDefault);
  const defaultCategories = categories.filter((c) => c.isDefault);
  void defaultCategories; // kept for possible future use
  const baseSymbol = currencies.find((c) => c.isBase)?.symbol ?? "Rs";

  const tabs = ["profile", "security", "categories", "currencies", "notifications", "data", ...(isSuperAdmin ? ["users"] : [])];

  return (
    <Tabs defaultValue="profile">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="currencies">Currencies</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="data">Data</TabsTrigger>
        {isSuperAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
      </TabsList>

      {/* Profile Tab */}
      <TabsContent value="profile" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Profile & Preferences</CardTitle>
            <CardDescription>Update your name, currency, and display preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} placeholder="Your name" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={settings?.email ?? ""} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
            </div>
            <div>
              <Label>Date Format</Label>
              <Select onValueChange={(v) => setProfile((p) => ({ ...p, dateFormat: v }))} defaultValue={profile.dateFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Week Starts On</Label>
              <Select onValueChange={(v) => setProfile((p) => ({ ...p, firstDayOfWeek: Number(v) }))} defaultValue={String(profile.firstDayOfWeek)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEEK_STARTS.map((w) => <SelectItem key={w.value} value={String(w.value)}>{w.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Emergency Fund Target (months)</Label>
              <Select onValueChange={(v) => setProfile((p) => ({ ...p, emergencyFundMonths: Number(v) }))} defaultValue={String(profile.emergencyFundMonths)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6, 7, 8, 9, 10, 12].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} months</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Target months of expenses to save in your emergency fund. 6 months is the standard recommendation.
              </p>
            </div>
            <div>
              <Label>Cash-flow Projection Window (months)</Label>
              <Select onValueChange={(v) => setProfile((p) => ({ ...p, cashflowHorizonMonths: Number(v) }))} defaultValue={String(profile.cashflowHorizonMonths)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3, 6, 8, 12, 18, 24].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} months</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                How far ahead the repayment planner projects loans, income, and known expenses.
              </p>
            </div>
            <div>
              <Label>Due-date Warning Lead Time (days)</Label>
              <Select onValueChange={(v) => setProfile((p) => ({ ...p, cashflowLeadTimeDays: Number(v) }))} defaultValue={String(profile.cashflowLeadTimeDays)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 3, 5, 7, 14].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} day{n !== 1 ? "s" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                How far ahead to warn about upcoming loan payments and known lump-sum expenses.
              </p>
            </div>
            <Button onClick={handleSaveProfile} disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Security Tab */}
      <TabsContent value="security" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Current Password</Label>
              <Input type="password" value={passwords.current} onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))} />
            </div>
            <div>
              <Label>New Password</Label>
              <Input type="password" value={passwords.new} onChange={(e) => setPasswords((p) => ({ ...p, new: e.target.value }))} />
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input type="password" value={passwords.confirm} onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))} />
            </div>
            <Button onClick={handleChangePassword} disabled={isPending}>
              {isPending ? "Changing..." : "Change Password"}
            </Button>
          </CardContent>
        </Card>

        <div className="mt-4">
          <TotpSettings />
        </div>
      </TabsContent>

      {/* Categories Tab */}
      <TabsContent value="categories" className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Add Category</CardTitle>
            <CardDescription>Create expense or income categories specific to your needs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 items-end">
              <div className="col-span-2 sm:col-span-1">
                <Label>Name</Label>
                <Input value={newCat.name} onChange={(e) => setNewCat((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Fuel" onKeyDown={(e) => e.key === "Enter" && handleAddCategory()} />
              </div>
              <div>
                <Label>Type</Label>
                <Select onValueChange={(v) => setNewCat((p) => ({ ...p, type: v }))} defaultValue="EXPENSE">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                    <SelectItem value="INCOME">Income</SelectItem>
                    <SelectItem value="BOTH">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Color</Label>
                <input type="color" value={newCat.color} onChange={(e) => setNewCat((p) => ({ ...p, color: e.target.value }))} className="h-9 w-full cursor-pointer rounded border border-input block" />
              </div>
              <Button className="w-full" onClick={handleAddCategory} disabled={addingCat}>
                <Plus className="h-4 w-4" />{addingCat ? "Adding..." : "Add"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {[
          { type: "EXPENSE", label: "Expense" },
          { type: "INCOME", label: "Income" },
          { type: "BOTH", label: "Both (Expense & Income)" },
        ].map(({ type, label }) => {
          const typeCats = categories.filter((c) => c.type === type);
          if (!typeCats.length) return null;
          return (
            <Card key={type}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold">{label}</CardTitle>
                  <Badge variant="outline" className="text-xs font-normal">{typeCats.length}</Badge>
                </div>
                <CardDescription className="text-xs">
                  {type === "EXPENSE" ? "Used when logging expenses" : type === "INCOME" ? "Used when logging income" : "Available for both expense and income"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {typeCats.map((cat) => (
                    <div
                      key={cat.id}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border text-sm transition-colors",
                        cat.isDefault
                          ? "pl-2.5 pr-2.5 py-1 bg-muted/40 border-border/60 text-muted-foreground"
                          : "pl-2.5 pr-1 py-1 bg-card hover:border-muted-foreground/40"
                      )}
                    >
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="leading-none">{cat.name}</span>
                      <button
                        onClick={() => setEditCat({ id: cat.id, name: cat.name, color: cat.color })}
                        className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-full ml-0.5"
                        title="Edit category"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setDeleteCatData({ id: cat.id, name: cat.name, isDefault: cat.isDefault })}
                        className="text-muted-foreground hover:text-red-500 transition-colors p-0.5 rounded-full"
                        title="Delete category"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </TabsContent>

      {/* Currencies Tab */}
      <TabsContent value="currencies" className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Add Currency</CardTitle>
            <CardDescription>
              Any currency you add can be used for pot balances and income entries. Rate is how many units of your base currency equal 1 unit of this currency.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 items-end">
              <div>
                <Label>Code</Label>
                <Input value={newCurrency.code} onChange={(e) => setNewCurrency((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. EUR" maxLength={10} />
              </div>
              <div>
                <Label>Symbol</Label>
                <Input value={newCurrency.symbol} onChange={(e) => setNewCurrency((p) => ({ ...p, symbol: e.target.value }))} placeholder="e.g. €" maxLength={6} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label>Rate to base</Label>
                <Input type="number" value={newCurrency.rateToBase} onChange={(e) => setNewCurrency((p) => ({ ...p, rateToBase: e.target.value }))} placeholder="e.g. 300" onKeyDown={(e) => e.key === "Enter" && handleAddCurrency()} />
              </div>
              <Button className="w-full" onClick={handleAddCurrency} disabled={addingCurrency || !newCurrency.code.trim() || !newCurrency.rateToBase}>
                <Plus className="h-4 w-4" />{addingCurrency ? "Adding..." : "Add"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Coins className="h-4 w-4" />Household Currencies</CardTitle>
            <CardDescription>The base currency is what every total, budget, and report is shown in.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {currencies.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border">
                <div className="flex items-center gap-2 min-w-[90px]">
                  {c.isBase
                    ? <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    : <span className="w-3.5 shrink-0" />}
                  <span className="font-semibold text-sm">{c.code}</span>
                  <span className="text-sm text-muted-foreground">{c.symbol}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
                  {c.isBase ? (
                    <span className="text-xs text-muted-foreground">Base currency (rate 1)</span>
                  ) : (
                    <>
                      <Input
                        type="number"
                        value={editingRates[c.id] ?? String(c.rateToBase)}
                        onChange={(e) => setEditingRates((prev) => ({ ...prev, [c.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveCurrencyRate(c.id)}
                        className="h-8 w-28 text-sm"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">per 1 {c.code}</span>
                      {editingRates[c.id] !== undefined && editingRates[c.id] !== String(c.rateToBase) && (
                        <Button size="sm" variant="outline" className="h-8" onClick={() => handleSaveCurrencyRate(c.id)} disabled={savingCurrencyId === c.id}>
                          {savingCurrencyId === c.id ? "Saving..." : "Save"}
                        </Button>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!c.isBase && (
                    <button
                      onClick={() => handleSetBaseCurrency(c.id)}
                      className="text-xs text-primary hover:underline"
                    >
                      Set as base
                    </button>
                  )}
                  {!c.isBase && (
                    <button
                      onClick={() => handleDeleteCurrency(c.id)}
                      className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                      title="Remove currency"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Notifications Tab */}
      <TabsContent value="notifications" className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Email Configuration</CardTitle>
            <CardDescription>Gmail SMTP status for sending alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {emailConfigured ? (
                <>
                  <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Email configured</p>
                    <p className="text-xs text-muted-foreground">Alerts will be sent via Gmail SMTP</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Email not configured</p>
                    <p className="text-xs text-muted-foreground">
                      Add <code className="bg-muted px-1 rounded">GMAIL_USER</code> and <code className="bg-muted px-1 rounded">GMAIL_APP_PASSWORD</code> to <code className="bg-muted px-1 rounded">.env.local</code> to enable alerts.
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Real-time Alerts</CardTitle>
            <CardDescription>Immediate emails triggered when you add an expense</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Budget warnings</p>
                <p className="text-xs text-muted-foreground">Email when a category hits 85% or exceeds 100% of budget</p>
              </div>
              <Switch
                checked={notifications.notifyBudgetWarning}
                onCheckedChange={(v) => setNotifications((p) => ({ ...p, notifyBudgetWarning: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Doom spending</p>
                <p className="text-xs text-muted-foreground">Email when you add 3+ expenses within 2 hours</p>
              </div>
              <Switch
                checked={notifications.notifyDoomSpending}
                onCheckedChange={(v) => setNotifications((p) => ({ ...p, notifyDoomSpending: v }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Daily Digest Email</CardTitle>
                <CardDescription>Morning summary sent at 7 AM - choose what to include</CardDescription>
              </div>
              <Switch
                checked={notifications.notifyDailyDigest}
                onCheckedChange={(v) => setNotifications((p) => ({ ...p, notifyDailyDigest: v }))}
              />
            </div>
          </CardHeader>
          <CardContent className={cn("space-y-5", !notifications.notifyDailyDigest && "opacity-50 pointer-events-none")}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Tasks</p>
                <p className="text-xs text-muted-foreground">Overdue tasks and tasks due today</p>
              </div>
              <Switch
                checked={notifications.notifyDigestTasks}
                onCheckedChange={(v) => setNotifications((p) => ({ ...p, notifyDigestTasks: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Calendar</p>
                <p className="text-xs text-muted-foreground">Today&apos;s and tomorrow&apos;s events</p>
              </div>
              <Switch
                checked={notifications.notifyDigestCalendar}
                onCheckedChange={(v) => setNotifications((p) => ({ ...p, notifyDigestCalendar: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Loan reminders</p>
                <p className="text-xs text-muted-foreground">Loans due within the next 7 days</p>
              </div>
              <Switch
                checked={notifications.notifyLoanDue}
                onCheckedChange={(v) => setNotifications((p) => ({ ...p, notifyLoanDue: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Budget alerts</p>
                <p className="text-xs text-muted-foreground">Categories at or over 80% of monthly budget</p>
              </div>
              <Switch
                checked={notifications.notifyDigestBudget}
                onCheckedChange={(v) => setNotifications((p) => ({ ...p, notifyDigestBudget: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Financial health</p>
                <p className="text-xs text-muted-foreground">Emergency fund status, missing income, end-of-month summary</p>
              </div>
              <Switch
                checked={notifications.notifyDigestFinancials}
                onCheckedChange={(v) => setNotifications((p) => ({ ...p, notifyDigestFinancials: v }))}
              />
            </div>
            <Button onClick={handleSaveNotifications} disabled={savingNotif}>
              {savingNotif ? "Saving..." : "Save Preferences"}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Data Tab */}
      <TabsContent value="data" className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Export Data</CardTitle>
            <CardDescription>Download all your data as a JSON backup file</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} disabled={isPending} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              {isPending ? "Exporting..." : "Download Backup (JSON)"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Includes all transactions, budgets, planners, savings, loans, and tasks.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Recurring Transactions
            </CardTitle>
            <CardDescription>Transactions marked as recurring - add them manually each month</CardDescription>
          </CardHeader>
          <CardContent>
            {recurringTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recurring transactions set up yet.</p>
            ) : (
              <div className="space-y-2">
                {recurringTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tx.category.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{tx.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {tx.category.name} · Last added {format(new Date(tx.date), "dd MMM yyyy")}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {tx.recurringFrequency?.toLowerCase() ?? "recurring"}
                    </Badge>
                    <span className={`text-sm font-semibold shrink-0 ${tx.type === "INCOME" ? "text-emerald-600" : "text-red-600"}`}>
                      {tx.type === "INCOME" ? "+" : "-"}{baseSymbol} {(tx.amount / 100).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Users Tab - SUPER_ADMIN only */}
      {isSuperAdmin && (
        <TabsContent value="users" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>App Users</CardTitle>
              <CardDescription>Manage who has access to this app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
                      <span className="text-xs font-bold text-primary">{u.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{u.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <Badge
                      className={u.role === "SUPER_ADMIN"
                        ? "bg-primary/10 text-primary dark:bg-primary/15 text-xs shrink-0"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-xs shrink-0"
                      }
                    >
                      {u.role === "SUPER_ADMIN" ? (
                        <><ShieldCheck className="h-3 w-3 mr-1" />Super Admin</>
                      ) : (
                        <><Shield className="h-3 w-3 mr-1" />Admin</>
                      )}
                    </Badge>
                    <button
                      onClick={() => handleToggleRole(u.id, u.role)}
                      className="text-xs text-muted-foreground hover:text-foreground underline shrink-0"
                      title="Toggle role"
                    >
                      Change role
                    </button>
                    <button
                      onClick={() => setDeleteUserId(u.id)}
                      className="text-muted-foreground hover:text-red-500 transition-colors p-1 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add User</CardTitle>
              <CardDescription>Create a new account - they can log in immediately</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name</Label>
                  <Input value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Sam" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} placeholder="email@gmail.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Password</Label>
                  <Input type="password" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} placeholder="Min. 8 characters" />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select onValueChange={(v) => setNewUser((p) => ({ ...p, role: v }))} defaultValue="ADMIN">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin - no vault, no user mgmt</SelectItem>
                      <SelectItem value="SUPER_ADMIN">Super Admin - full access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreateUser} disabled={creatingUser}>
                <Plus className="h-4 w-4 mr-1" />
                {creatingUser ? "Creating..." : "Create User"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-red-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                Reset App Data
              </CardTitle>
              <CardDescription>
                Permanently delete data for everyone using this app. Pick exactly what to wipe -
                nothing outside your selection is touched.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-2">
                {RESET_GROUPS.map((g) => (
                  <label
                    key={g.key}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={resetKeys.has(g.key)}
                      onCheckedChange={() => toggleResetKey(g.key)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{g.label}</div>
                      <div className="text-xs text-muted-foreground">{g.description}</div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="destructive"
                  disabled={resetKeys.size === 0}
                  onClick={() => setResetDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Reset Selected ({resetKeys.size})
                </Button>
                {resetKeys.size > 0 && (
                  <button
                    onClick={() => setResetKeys(new Set())}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Clear selection
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      )}

      <ConfirmDialog
        open={!!deleteCatData}
        onOpenChange={(o) => !o && setDeleteCatData(null)}
        title={deleteCatData?.isDefault ? `Delete default category "${deleteCatData.name}"?` : "Delete category?"}
        description={
          deleteCatData?.isDefault
            ? "This is a built-in category shared by the whole household. Deleting it removes it everywhere, not just for you. Transactions using it will keep it as a reference."
            : "Transactions using this category will keep it as a reference."
        }
        onConfirm={() => handleDeleteCategory(deleteCatData!.id)}
      />

      <Dialog open={!!editCat} onOpenChange={(o) => !o && setEditCat(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <Label>Name</Label>
              <Input
                value={editCat?.name ?? ""}
                onChange={(e) => setEditCat((p) => (p ? { ...p, name: e.target.value } : p))}
                onKeyDown={(e) => e.key === "Enter" && handleSaveEditCategory()}
              />
            </div>
            <div>
              <Label>Color</Label>
              <input
                type="color"
                value={editCat?.color ?? "#6366f1"}
                onChange={(e) => setEditCat((p) => (p ? { ...p, color: e.target.value } : p))}
                className="h-9 w-14 cursor-pointer rounded border border-input block"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCat(null)} disabled={savingEditCat}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditCategory} disabled={savingEditCat || !editCat?.name.trim()}>
              {savingEditCat ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleteUserId}
        onOpenChange={(o) => !o && setDeleteUserId(null)}
        title="Delete user?"
        description="All their data (transactions, budgets, tasks, etc.) will be permanently deleted."
        onConfirm={handleDeleteUser}
      />
      <ConfirmDialog
        key={resetDialogKey}
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        title={`Reset ${resetKeys.size} data type${resetKeys.size === 1 ? "" : "s"}?`}
        description={`This permanently deletes: ${[...resetKeys].map((k) => RESET_GROUPS.find((g) => g.key === k)?.label).join(", ")}. This cannot be undone.`}
        confirmLabel="Reset Data"
        confirmPhrase="DELETE"
        loading={resetting}
        onConfirm={handleResetData}
      />
    </Tabs>
  );
}
