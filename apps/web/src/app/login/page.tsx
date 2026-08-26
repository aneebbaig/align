import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/session";
import { LoginForm } from "@/components/auth/login-form";
import { AlignLogo } from "@/components/shared/align-logo";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const user = await getServerUser();
  if (user) redirect("/dashboard");

  const { callbackUrl } = await searchParams;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[360px]">
        {/* Brand */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center mb-4">
            <AlignLogo size={52} />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">{APP_NAME}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Private Finance OS</p>
        </div>

        {/* Form panel */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm dark:shadow-none">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-foreground">Welcome back</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sign in to access your dashboard
            </p>
          </div>
          <LoginForm callbackUrl={callbackUrl || "/dashboard"} />
        </div>
      </div>
    </div>
  );
}
