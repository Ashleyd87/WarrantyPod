import React from "react";
import { Redirect, Stack } from "expo-router";
import { useSessionUser } from "@/lib/auth-client";
import { ink } from "@/lib/theme";
import { LoadingScreen } from "@/components/ui";

/**
 * Auth gate for every screen outside the (tabs) group — profile, alerts,
 * the add flow and item screens. Without it, a dead or userless session
 * renders these as broken shells (blank identity, silent 401s) instead of
 * routing back to sign-in.
 */
export default function ProtectedLayout() {
  const { user, isPending } = useSessionUser();

  if (isPending) return <LoadingScreen />;
  if (!user) return <Redirect href="/welcome" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: ink.paper },
      }}
    />
  );
}
