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

export default function SignupScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!name || !email || !password) return;
    if (password.length < 8) {
      Alert.alert("Weak password", "Use at least 8 characters.");
      return;
    }
    setLoading(true);
    const { error } = await authClient.signUp.email({ name, email, password });
    setLoading(false);
    if (error) {
      Alert.alert("Sign up failed", error.message ?? "Try again.");
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
          <Headline>Proof starts{"\n"}here.</Headline>
          <View style={{ gap: 16 }}>
            <Field label="Name" value={name} onChangeText={setName} placeholder="Ashley" />
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="At least 8 characters"
            />
          </View>
          <Pill
            label="Create account"
            variant="ink"
            arrow
            loading={loading}
            onPress={submit}
          />
          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: 13.5,
              color: ink.textSecondary,
              textAlign: "center",
            }}
          >
            Already have an account?{" "}
            <Link
              href="/login"
              style={{ fontFamily: fonts.semibold, color: t.accentText }}
            >
              Sign in
            </Link>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
