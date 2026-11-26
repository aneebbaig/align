"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resetAppData } from "@/actions/reset";
import { adminCreateUser, adminDeleteUser, adminUpdateUserRole } from "@/actions/users";
import { RESET_GROUPS } from "@/lib/reset-groups";
import { Plus, Trash2, ShieldCheck, Shield, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { AppUser } from "@/components/settings/settings-types";

export function UsersTab({ users }: { users: AppUser[] }) {
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

  return (
    <>
      <TabsContent forceMount value="users" className="mt-4 space-y-4">
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
    </>
  );
}
