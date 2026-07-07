import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/signup" />
        <Stack.Screen
          name="item/[id]/index"
          options={{
            headerShown: true,
            title: "Product",
            headerTintColor: colors.primary,
            headerStyle: { backgroundColor: colors.card },
          }}
        />
        <Stack.Screen
          name="item/[id]/edit"
          options={{
            headerShown: true,
            title: "Edit product",
            headerTintColor: colors.primary,
            headerStyle: { backgroundColor: colors.card },
          }}
        />
      </Stack>
    </>
  );
}
