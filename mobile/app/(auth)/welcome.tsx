import React from "react";
import { Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { authClient } from "@/lib/auth-client";
import { fonts } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import { Barcode } from "@/components/Barcode";
import { LoadingScreen, Mono, Pill } from "@/components/ui";

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <LoadingScreen />;
  if (session) return <Redirect href="/(tabs)" />;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.welcomeBg,
        paddingHorizontal: 22,
        paddingTop: 84,
        paddingBottom: 34,
      }}
    >
      {/* Brand art */}
      <View style={{ flex: 1 }}>
        <View style={{ transform: [{ rotate: "-22deg" }], width: 52, marginBottom: 44 }}>
          <Feather name="key" size={52} color={t.welcomeInk} />
        </View>
        <Barcode color={t.welcomeInk} height={150} />
        <View style={{ marginTop: 18 }}>
          <Mono size={13} color={t.welcomeInk} style={{ letterSpacing: 3 }}>
            SN 8H24-99401-B
          </Mono>
        </View>
      </View>

      {/* Copy + CTA */}
      <View>
        <Text
          style={{
            fontFamily: fonts.extrabold,
            fontSize: 33,
            lineHeight: 38.5,
            color: t.welcomeInk,
          }}
        >
          Welcome{"\n"}to Serial Vault,
        </Text>
        <Text
          style={{
            fontFamily: fonts.medium,
            fontSize: 21,
            color: t.welcomeInk,
            opacity: 0.78,
            marginTop: 8,
          }}
        >
          where proof never gets lost
        </Text>
        <Pill
          label="Get started"
          arrow
          variant="welcome"
          onPress={() => router.push("/login")}
          style={{ alignSelf: "flex-start", marginTop: 26 }}
        />
      </View>
    </View>
  );
}
