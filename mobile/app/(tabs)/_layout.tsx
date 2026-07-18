import React, { useEffect } from "react";
import { Redirect, Tabs } from "expo-router";
import { api, type ApiSettings } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { ink } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import { TabBar } from "@/components/TabBar";
import { LoadingScreen } from "@/components/ui";

export default function TabsLayout() {
  const { data: session, isPending } = authClient.useSession();
  const { syncFromServer } = useTheme();

  // Adopt the account's stored theme once signed in.
  useEffect(() => {
    if (session) {
      api<{ settings: ApiSettings }>("/api/settings")
        .then((d) => syncFromServer(d.settings.theme))
        .catch(() => {});
    }
  }, [session, syncFromServer]);

  if (isPending) return <LoadingScreen />;
  if (!session) return <Redirect href="/welcome" />;

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
