import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from "@expo-google-fonts/hanken-grotesk";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
} from "@expo-google-fonts/jetbrains-mono";
import { resetLocalAppData } from "@/lib/app-reset";
import { ink } from "@/lib/theme";
import { ThemeProvider } from "@/lib/theme-context";

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Expo Router renders this instead of crashing the app when a screen throws.
 * Without it, a single bad render kills the process on every launch and the
 * app becomes unopenable — recoverable only by reinstalling.
 *
 * Deliberately self-sufficient: system fonts only (custom fonts may not be
 * loaded when the error hits) and it hides the native splash screen itself —
 * on a launch crash RootLayout's hide effect never commits, and without this
 * the recovery UI would sit invisible behind the frozen splash.
 */
export function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => Promise<void>;
}) {
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  async function resetAndRetry() {
    if (resetting) return;
    setResetting(true);
    try {
      // Signs out (server + in-memory session atom) and purges every
      // SecureStore key the app writes, chunked auth values included.
      await resetLocalAppData();
    } finally {
      setResetting(false);
      await retry();
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: ink.paper,
        alignItems: "center",
        justifyContent: "center",
        padding: 30,
        gap: 16,
      }}
    >
      <Text style={{ fontWeight: "800", fontSize: 22, color: ink.ink }}>
        Something went wrong
      </Text>
      <Text
        style={{
          fontSize: 14,
          lineHeight: 21,
          color: ink.textSecondary,
          textAlign: "center",
        }}
      >
        {error.message || "Unexpected error"}
      </Text>
      <Pressable
        onPress={retry}
        style={({ pressed }) => ({
          height: 52,
          paddingHorizontal: 30,
          borderRadius: 999,
          backgroundColor: ink.ink,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale: pressed ? 0.96 : 1 }],
        })}
      >
        <Text style={{ fontWeight: "700", fontSize: 15, color: "#FFFFFF" }}>
          Try again
        </Text>
      </Pressable>
      {/* Escape hatch: a corrupt stored session can't wedge the app forever. */}
      <Pressable onPress={resetAndRetry} hitSlop={8} disabled={resetting}>
        <Text
          style={{
            fontWeight: "600",
            fontSize: 13.5,
            color: ink.textSecondary,
            textDecorationLine: "underline",
          }}
        >
          {resetting ? "Resetting…" : "Reset app data & sign out"}
        </Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: ink.paper },
        }}
      />
    </ThemeProvider>
  );
}
