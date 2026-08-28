import React from "react";
import { Stack } from "expo-router";
import { ink } from "@/lib/theme";

/** Plain stack — the vault is on-device, so there is nothing to gate on. */
export default function ProtectedLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: ink.paper },
      }}
    />
  );
}
