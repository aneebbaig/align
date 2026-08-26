"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

type Stage = "off" | "enrolling" | "backup" | "on";

// better-auth twoFactor client. Enabling AND disabling both require the current
// password (step-up), enforced by better-auth.
export function TotpSettings() {
  const { data: session } = authClient.useSession();
  const enabled = (session?.user as { twoFactorEnabled?: boolean } | undefined)?.twoFactorEnabled ?? false;

  const [stage, setStage] = useState<Stage | null>(null);
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  const current: Stage = stage ?? (enabled ? "on" : "off");

  async function begin() {
    setPending(true);
    const { data, error } = await authClient.twoFactor.enable({ password });
    setPending(false);
    if (error || !data) {
      toast.error(error?.message ?? "Failed to start. Check your password.");
      return;
    }
    setPassword("");
    try {
      setSecret(new URL(data.totpURI).searchParams.get("secret") ?? "");
    } catch {
      setSecret("");
    }
    setBackupCodes(data.backupCodes ?? []);
    setCode("");
    setStage("enrolling");
  }

  async function confirm() {
    setPending(true);
    const { error } = await authClient.twoFactor.verifyTotp({ code: code.trim() });
    setPending(false);
    if (error) {
      toast.error("Invalid code — try again");
      return;
    }
    setStage("backup");
    toast.success("Two-factor authentication enabled");
  }

  async function disable() {
    setPending(true);
    const { error } = await authClient.twoFactor.disable({ password });
    setPending(false);
    if (error) {
      toast.error(error.message ?? "Wrong password");
      return;
    }
    setPassword("");
    setStage("off");
    toast.success("Two-factor authentication disabled");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>Require a code from an authenticator app at sign-in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {current === "off" && (
          <div className="space-y-3 max-w-[280px]">
            <div>
              <Label>Confirm password to enable</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button onClick={begin} disabled={pending || !password}>
              {pending ? "Starting…" : "Enable 2FA"}
            </Button>
          </div>
        )}

        {current === "enrolling" && (
          <div className="space-y-3 max-w-[280px]">
            <p className="text-sm text-muted-foreground">
              Add this key to your authenticator app, then enter the code.
            </p>
            <p className="text-xs break-all">
              Manual key: <code className="font-mono">{secret}</code>
            </p>
            <div>
              <Label>Code from app</Label>
              <Input inputMode="numeric" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={confirm} disabled={pending || code.trim().length < 6}>
                {pending ? "Verifying…" : "Verify & enable"}
              </Button>
              <Button variant="outline" onClick={() => setStage("off")} disabled={pending}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {current === "backup" && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Save your backup codes</p>
            <p className="text-xs text-muted-foreground">
              Each works once if you lose your authenticator. They won’t be shown again.
            </p>
            <div className="grid grid-cols-2 gap-2 rounded border p-3 font-mono text-sm max-w-[280px]">
              {backupCodes.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
            <Button onClick={() => setStage("on")}>I’ve saved them</Button>
          </div>
        )}

        {current === "on" && (
          <div className="space-y-3 max-w-[280px]">
            <p className="text-sm text-green-600 dark:text-green-500">2FA is enabled.</p>
            <div>
              <Label>Confirm password to disable</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button variant="destructive" onClick={disable} disabled={pending || !password}>
              {pending ? "Disabling…" : "Disable 2FA"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
