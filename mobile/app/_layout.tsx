import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SecureStore from "expo-secure-store";
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
import { fonts, ink } from "@/lib/theme";
import { ThemeProvider } from "@/lib/theme-context";

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Expo Router renders this instead of crashing the app when a screen throws.
 * Without it, a single bad render kills the process on every launch and the
 * app becomes unopenable — recoverable only by reinstalling.
 */
export function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => Promise<void>;
}) {
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
      <Text
        style={{ fontFamily: fonts.extrabold, fontSize: 22, color: ink.ink }}
      >
        Something went wrong
      </Text>
      <Text
        style={{
          fontFamily: fonts.regular,
          fontSize: 14,
          lineHeight: 21,
          color: ink.textSecondary,
          textAlign: "center",
        }}
      >
        {error?.message ?? "Unexpected error"}
      </Text>
      <Pressable
        onPress={() => retry()}
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
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: "#FFFFFF" }}>
          Try again
        </Text>
      </Pressable>
      {/* Escape hatch: a corrupt stored session can't wedge the app forever. */}
      <Pressable
        onPress={async () => {
          // Keys written by @better-auth/expo (storagePrefix "warranty-vault")
          // plus our own theme cache.
          for (const key of [
            "warranty-vault_cookie",
            "warranty-vault_session_data",
            "warranty-vault.oauth_state",
            "warranty-vault.theme",
          ]) {
            try {
              await SecureStore.deleteItemAsync(key);
            } catch {}
          }
          retry();
        }}
        hitSlop={8}
      >
        <Text
          style={{
            fontFamily: fonts.semibold,
            fontSize: 13.5,
            color: ink.textSecondary,
            textDecorationLine: "underline",
          }}
        >
          Reset app data & sign out
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
