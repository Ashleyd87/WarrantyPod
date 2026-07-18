import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "@/lib/auth-client";
import { fonts, ink, SCREEN_PAD } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import { Header } from "@/components/Header";
import { Field, Headline, Pill } from "@/components/ui";

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email || !password) return;
    setLoading(true);
    const { error } = await authClient.signIn.email({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert("Sign in failed", error.message ?? "Check your details and try again.");
      return;
    }
    router.replace("/(tabs)");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ink.paper }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: SCREEN_PAD, gap: 26, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <Header back right={<View style={{ width: 44 }} />} />
          <Headline>Unlock{"\n"}your vault.</Headline>
          <View style={{ gap: 16 }}>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>
          <Pill label="Sign in" variant="ink" arrow loading={loading} onPress={submit} />
          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: 13.5,
              color: ink.textSecondary,
              textAlign: "center",
            }}
          >
            No account?{" "}
            <Link
              href="/signup"
              style={{ fontFamily: fonts.semibold, color: t.accentText }}
            >
              Create one
            </Link>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
