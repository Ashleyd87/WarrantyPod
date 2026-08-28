import React, { useEffect, useState } from "react";
import { Redirect, Tabs } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { ONBOARDED_KEY } from "@/lib/app-reset";
import { vault } from "@/lib/vault";
import { ink } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import { TabBar } from "@/components/TabBar";
import { LoadingScreen } from "@/components/ui";

function hasOnboarded(): boolean {
  try {
    return SecureStore.getItem(ONBOARDED_KEY) === "1";
  } catch {
    return false;
  }
}

export default function TabsLayout() {
  const { syncFromServer } = useTheme();
  const [onboarded] = useState(hasOnboarded);
  const [ready, setReady] = useState(false);

  // Adopt the theme saved in the local vault document.
  useEffect(() => {
    vault
      .settings()
      .then((s) => syncFromServer(s.theme))
      .catch(() => {})
      .finally(() => setReady(true));
  }, [syncFromServer]);

  if (!onboarded) return <Redirect href="/welcome" />;
  if (!ready) return <LoadingScreen />;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: ink.paper },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="items" />
      <Tabs.Screen name="claims" />
    </Tabs>
  );
}
