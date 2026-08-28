import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { fonts, ink, SCREEN_PAD } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import { Header } from "@/components/Header";
import { Headline, Pill } from "@/components/ui";

function OutlineChip({
  label,
  onInk = false,
}: {
  label: string;
  onInk?: boolean;
}) {
  return (
    <View
      style={{
        height: 26,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: onInk ? "rgba(255,255,255,0.28)" : "rgba(11,11,11,0.25)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontFamily: fonts.semibold,
          fontSize: 11.5,
          color: onInk ? "rgba(255,255,255,0.85)" : ink.ink,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function AddToVaultScreen() {
  const router = useRouter();
  const { t } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ink.paper }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PAD,
          paddingTop: 10,
          paddingBottom: 40,
        }}
      >
        <Header title="Add to vault" back />
        <Headline style={{ marginTop: 22 }}>
          How do you want{"\n"}to add proof?
        </Headline>

        {/* Primary option card — scan with camera (accent surface) */}
        <View
          style={{
            marginTop: 20,
            backgroundColor: t.accentSurface,
            borderWidth: 1.5,
            borderColor: t.accentSurfaceBorder,
            borderRadius: 26,
            padding: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: ink.ink,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="camera" size={21} color={t.accentSurface} />
            </View>
            <Text
              style={{
                fontFamily: fonts.extrabold,
                fontSize: 20,
                letterSpacing: -0.3,
                color: ink.ink,
              }}
            >
              Scan with camera
            </Text>
          </View>
          <Text
            style={{
              marginTop: 12,
              fontFamily: fonts.regular,
              fontSize: 13.5,
              lineHeight: 20,
              color: "rgba(11,11,11,0.75)",
            }}
          >
            Photograph the appliance, its serial sticker and the receipt — AI
            reads the rest.
          </Text>
          <View style={{ marginTop: 14, flexDirection: "row", gap: 8 }}>
            <OutlineChip label="Appliance" />
            <OutlineChip label="Serial sticker" />
            <OutlineChip label="Receipt" />
          </View>
          <Pill
            label="Open camera"
            arrow
            variant="ink"
            height={50}
            style={{ marginTop: 16 }}
            onPress={() => router.push("/add/camera")}
          />
        </View>

        {/* Secondary card — import order email (ink) */}
        <View
          style={{
            marginTop: 14,
            backgroundColor: ink.ink,
            borderRadius: 26,
            padding: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: t.accentOnInk,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="mail" size={20} color={t.onAccentOnInk} />
            </View>
            <Text
              style={{
                fontFamily: fonts.extrabold,
                fontSize: 20,
                letterSpacing: -0.3,
                color: "#FFFFFF",
              }}
            >
              Upload order email
            </Text>
          </View>
          <Text
            style={{
              marginTop: 12,
              fontFamily: fonts.regular,
              fontSize: 13.5,
              lineHeight: 20,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            Pick an order confirmation from your files — purchase date, price
            and store fill in automatically. Your mailbox is never connected or
            scanned.
          </Text>
          <View style={{ marginTop: 14, flexDirection: "row", gap: 8 }}>
            <OutlineChip label="PDF" onInk />
            <OutlineChip label="EML" onInk />
            <OutlineChip label="Screenshot" onInk />
          </View>
          <Pill
            label="Choose email"
            arrow
            variant="white"
            height={50}
            style={{ marginTop: 16 }}
            onPress={() => router.push("/add/email")}
          />
        </View>

        {/* Manual link */}
        <Pressable
          onPress={() => router.push("/add/form")}
          style={{ marginTop: 18 }}
          hitSlop={8}
        >
          <Text
            style={{
              fontFamily: fonts.semibold,
              fontSize: 13.5,
              color: ink.textSecondary,
              textAlign: "center",
            }}
          >
            or{" "}
            <Text
              style={{ color: ink.ink, textDecorationLine: "underline" }}
            >
              enter details manually
            </Text>
          </Text>
        </Pressable>

        {/* Footer note */}
        <View
          style={{
            marginTop: 26,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <Ionicons name="sparkles" size={16} color={ink.ink} />
          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: 12.5,
              color: ink.textSecondary,
            }}
          >
            AI extracts brand, model, serial & warranty from anything you add
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
