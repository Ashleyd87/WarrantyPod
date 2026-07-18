import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { addFlow } from "@/lib/add-flow";
import { fonts, ink, SCREEN_PAD } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import { Header } from "@/components/Header";
import { Chip, Headline, Pill } from "@/components/ui";

export default function AddToVaultScreen() {
  const router = useRouter();
  const { t } = useTheme();

  async function chooseEmail() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.6,
    });
    if (result.canceled || !result.assets?.[0]) return;
    addFlow.addPhoto({ uri: result.assets[0].uri, assetType: "RECEIPT" });
    router.push("/add/form");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ink.paper }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PAD,
          paddingTop: 10,
          paddingBottom: 40,
          gap: 22,
        }}
      >
        <Header title="Add to vault" back />
        <Headline>How do you want{"\n"}to add proof?</Headline>

        {/* Card 1 — scan with camera (accent) */}
        <View
          style={{
            backgroundColor: t.accent,
            borderRadius: 26,
            padding: 22,
            gap: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
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
              <Feather name="camera" size={21} color={t.accent === ink.ink ? "#FFFFFF" : t.accent} />
            </View>
            <Text
              style={{ fontFamily: fonts.extrabold, fontSize: 20, letterSpacing: -0.3, color: t.onAccent }}
            >
              Scan with camera
            </Text>
          </View>
          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: 13.5,
              lineHeight: 20,
              color: t.onAccent,
              opacity: 0.85,
            }}
          >
            Photograph the appliance, its serial sticker and the receipt — AI
            reads the rest.
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {["Appliance", "Serial sticker", "Receipt"].map((c) => (
              <View
                key={c}
                style={{
                  borderWidth: 1,
                  borderColor: t.onAccent === "#FFFFFF" ? "rgba(255,255,255,0.4)" : "rgba(11,11,11,0.25)",
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{ fontFamily: fonts.semibold, fontSize: 12, color: t.onAccent }}
                >
                  {c}
                </Text>
              </View>
            ))}
          </View>
          <Pill
            label="Open camera"
            arrow
            variant="ink"
            height={50}
            onPress={() => router.push("/add/camera")}
          />
        </View>

        {/* Card 2 — import order email (ink) */}
        <View
          style={{ backgroundColor: ink.ink, borderRadius: 26, padding: 22, gap: 14 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: t.accentOnInkBg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="mail" size={20} color={t.accentOnInkText} />
            </View>
            <Text
              style={{ fontFamily: fonts.extrabold, fontSize: 20, letterSpacing: -0.3, color: "#FFFFFF" }}
            >
              Import order email
            </Text>
          </View>
          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: 13.5,
              lineHeight: 20,
              color: ink.onInkSecondary,
            }}
          >
            Upload a screenshot of an order confirmation — purchase date, price
            and store fill in automatically.
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {["Screenshot", "Photo"].map((c) => (
              <View
                key={c}
                style={{
                  borderWidth: 1,
                  borderColor: ink.onInkBorder,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{ fontFamily: fonts.semibold, fontSize: 12, color: "#FFFFFF" }}
                >
                  {c}
                </Text>
              </View>
            ))}
          </View>
          <Pill
            label="Choose email"
            arrow
            variant="white"
            height={50}
            onPress={chooseEmail}
          />
        </View>

        {/* Manual link */}
        <Pressable onPress={() => router.push("/add/form")}>
          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: 14,
              color: ink.textSecondary,
              textAlign: "center",
            }}
          >
            or{" "}
            <Text
              style={{
                fontFamily: fonts.bold,
                color: ink.ink,
                textDecorationLine: "underline",
              }}
            >
              enter details manually
            </Text>
          </Text>
        </Pressable>

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 10,
            paddingHorizontal: 8,
            marginTop: 8,
          }}
        >
          <Ionicons name="sparkles-outline" size={15} color={ink.textSecondary} />
          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: 12.5,
              lineHeight: 18,
              color: ink.textSecondary,
              flex: 1,
            }}
          >
            AI extracts brand, model, serial & warranty from anything you add
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
