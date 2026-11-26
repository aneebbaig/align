"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { changePassword } from "@/actions/settings";
import { TotpSettings } from "@/components/settings/totp-settings";

export function SecurityTab() {
  const [isPending, startTransition] = useTransition();

  // Password state
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
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

  return (
    <>
      <TabsContent forceMount value="security" className="mt-4">
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
    </>
  );
}
