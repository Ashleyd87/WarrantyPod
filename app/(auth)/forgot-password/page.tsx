"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    setLoading(true);
    // Always report success (don't reveal whether an email is registered).
    await authClient
      .requestPasswordReset({ email, redirectTo: "/reset-password" })
      .catch(() => {});
    setLoading(false);
    setSent(true);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-8" />
          </div>
          <h1 className="text-2xl font-bold">Warranty Vault</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{sent ? "Check your email" : "Reset your password"}</CardTitle>
            <CardDescription>
              {sent
                ? "If that email is registered, a reset link is on its way. It expires in 1 hour."
                : "Enter your email and we'll send a link to set a new password."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <Button asChild className="w-full">
                <Link href="/login">Back to sign in</Link>
              </Button>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <Link href="/login" className="font-medium text-primary hover:underline">
                    Back to sign in
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
