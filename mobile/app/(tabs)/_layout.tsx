import React, { useEffect } from "react";
import { Redirect, Tabs } from "expo-router";
import { api, type ApiSettings } from "@/lib/api";
import { useSessionUser } from "@/lib/auth-client";
import { ink } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import { TabBar } from "@/components/TabBar";
import { LoadingScreen } from "@/components/ui";

export default function TabsLayout() {
  const { user, isPending } = useSessionUser();
  const { syncFromServer } = useTheme();
  const userId = user?.id;

  // Adopt the account's stored theme once per signed-in identity. Keyed on
  // the user id (a stable primitive) so session refetches don't refire it,
  // and gated like the render below so a userless session fetches nothing.
  useEffect(() => {
    if (userId) {
      api<{ settings: ApiSettings }>("/api/settings")
        .then((d) => syncFromServer(d.settings.theme))
        .catch(() => {});
    }
  }, [userId, syncFromServer]);

  if (isPending) return <LoadingScreen />;
  // Gate on the user, not just the session object: a rehydrated-but-incomplete
  // session would otherwise render screens that read session.user and crash.
  if (!user) return <Redirect href="/welcome" />;

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
