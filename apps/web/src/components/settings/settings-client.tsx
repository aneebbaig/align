"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AppUser, Category, Currency, RecurringTransaction, UserSettings } from "@/components/settings/settings-types";
import { ProfileTab } from "@/components/settings/profile-tab";
import { SecurityTab } from "@/components/settings/security-tab";
import { CategoriesTab } from "@/components/settings/categories-tab";
import { CurrenciesTab } from "@/components/settings/currencies-tab";
import { NotificationsTab } from "@/components/settings/notifications-tab";
import { DataTab } from "@/components/settings/data-tab";
import { UsersTab } from "@/components/settings/users-tab";

export function SettingsClient({
  settings,
  categories,
  currencies,
  recurringTransactions,
  users,
  role,
  emailConfigured,
  hiddenSections = [],
}: {
  settings: UserSettings | null;
  categories: Category[];
  currencies: Currency[];
  recurringTransactions: RecurringTransaction[];
  users: AppUser[];
  role: string;
  emailConfigured: boolean;
  hiddenSections?: string[];
}) {
  const isSuperAdmin = role === "SUPER_ADMIN";

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

      <ProfileTab settings={settings} hiddenSections={hiddenSections} />
      <SecurityTab />
      <CategoriesTab categories={categories} />
      <CurrenciesTab currencies={currencies} />
      <NotificationsTab settings={settings} emailConfigured={emailConfigured} />
      <DataTab currencies={currencies} recurringTransactions={recurringTransactions} />
      {isSuperAdmin && <UsersTab users={users} />}
    </Tabs>
  );
}
