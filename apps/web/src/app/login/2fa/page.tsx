"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export default function TwoFactorPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    const clean = code.trim();
    const { error } = useBackup
      ? await authClient.twoFactor.verifyBackupCode({ code: clean })
      : await authClient.twoFactor.verifyTotp({ code: clean });
    setPending(false);
    if (error) {
      toast.error(useBackup ? "Invalid backup code" : "Invalid authentication code");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto mt-24 w-full max-w-sm space-y-4 px-4">
      <div className="space-y-1.5">
        <Label
          htmlFor="code"
          className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground"
        >
          {useBackup ? "Backup code" : "Authentication code"}
        </Label>
        <Input
          id="code"
          inputMode={useBackup ? "text" : "numeric"}
          autoComplete="one-time-code"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && code.trim() && submit()}
        />
      </div>
      <Button className="w-full" onClick={submit} disabled={pending || !code.trim()}>
        {pending ? "Verifying…" : "Verify"}
      </Button>
      <button
        type="button"
        className="w-full text-center text-xs text-muted-foreground underline"
        onClick={() => setUseBackup((v) => !v)}
      >
        {useBackup ? "Use authenticator code instead" : "Use a backup code instead"}
      </button>
    </div>
  );
}
