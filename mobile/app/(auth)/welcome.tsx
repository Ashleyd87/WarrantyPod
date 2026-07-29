import React, { useRef, useState } from "react";
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Redirect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { Feather } from "@expo/vector-icons";
import { ONBOARDED_KEY } from "@/lib/app-reset";
import { useSessionUser } from "@/lib/auth-client";
import { fonts } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import { LoadingScreen } from "@/components/ui";

const PAGES = [
  {
    image: require("../../assets/laptop-ink.png"),
    imageHeight: 250,
    headline: "Log gear as\nyou buy it",
    body: "Snap the receipt or forward the purchase email — details file themselves.",
  },
  {
    image: require("../../assets/vault-user.png"),
    imageHeight: 260,
    headline: "Safe in one place",
    body: "Stored securely, with a flag before any warranty expires.",
  },
  {
    image: require("../../assets/claim-ink.png"),
    imageHeight: 290,
    headline: "Claim in one tap",
    body: "Faulty product? Export a ready-to-send claim package as a PDF.",
  },
] as const;

function markOnboarded() {
  try {
    SecureStore.setItem(ONBOARDED_KEY, "1");
  } catch {}
}

function hasOnboarded(): boolean {
  try {
    return SecureStore.getItem(ONBOARDED_KEY) === "1";
  } catch {
    return false;
  }
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const { user, isPending } = useSessionUser();
  const [index, setIndex] = useState(0);
  // Read once per mount so tapping "back" mid-flow doesn't bounce to login.
  const [onboarded] = useState(hasOnboarded);
  const scrollRef = useRef<ScrollView>(null);
  const width = Dimensions.get("window").width;

  if (isPending) return <LoadingScreen />;
  if (user) return <Redirect href="/(tabs)" />;
  // Returning (signed-out) users skip straight to sign-in.
  if (onboarded) return <Redirect href="/login" />;

  function goTo(i: number) {
    scrollRef.current?.scrollTo({ x: i * width, animated: true });
    setIndex(i);
  }

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(Math.max(0, Math.min(PAGES.length - 1, i)));
  }

  function next() {
    if (index < PAGES.length - 1) {
      goTo(index + 1);
    } else {
      markOnboarded();
      router.push("/signup");
    }
  }

  function leave() {
    markOnboarded();
    router.push("/login");
  }

  const last = index === PAGES.length - 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.splashBg }}>
      <View style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          style={{ flex: 1 }}
        >
          {PAGES.map((page, i) => (
            <View
              key={i}
              style={{
                width,
                paddingHorizontal: 30,
                paddingTop: 26,
                alignItems: "center",
              }}
            >
              {/* Key logomark */}
              <Feather name="key" size={30} color={t.splashInk} />
              <View
                style={{
                  flex: 1,
                  alignSelf: "stretch",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image
                  source={page.image}
                  style={{
                    height: page.imageHeight,
                    width: width - 60,
                    resizeMode: "contain",
                  }}
                />
              </View>
              <Text
                style={{
                  fontFamily: fonts.extrabold,
                  fontSize: 35,
                  lineHeight: 38.5,
                  letterSpacing: -0.4,
                  color: t.splashInk,
                  textAlign: "center",
                }}
              >
                {page.headline}
              </Text>
              <Text
                style={{
                  marginTop: 14,
                  fontFamily: fonts.regular,
                  fontSize: 16,
                  lineHeight: 24,
                  color: t.splashBody,
                  textAlign: "center",
                  maxWidth: 300,
                }}
              >
                {page.body}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Dots · button · link */}
        <View style={{ paddingHorizontal: 30, paddingBottom: 16, alignItems: "center" }}>
          <View style={{ flexDirection: "row", gap: 7, marginVertical: 24 }}>
            {PAGES.map((_, i) => (
              <View
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i === index ? t.splashInk : t.splashDotInactive,
                }}
              />
            ))}
          </View>
          <Pressable
            onPress={next}
            style={({ pressed }) => ({
              height: 56,
              borderRadius: 999,
              backgroundColor: t.splashBtnBg,
              alignItems: "center",
              justifyContent: "center",
              alignSelf: "stretch",
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
          >
            <Text
              style={{
                fontFamily: fonts.bold,
                fontSize: 16.5,
                color: t.splashBtnText,
              }}
            >
              {last ? "Get started" : "Next"}
            </Text>
          </Pressable>
          <Pressable onPress={leave} hitSlop={10} style={{ marginTop: 14 }}>
            <Text
              style={{
                fontFamily: fonts.semibold,
                fontSize: 12.5,
                color: t.splashInk,
                opacity: 0.6,
              }}
            >
              {last ? "Already have an account? Log in" : "Skip for now"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
