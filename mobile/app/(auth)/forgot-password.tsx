import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "@/lib/auth-client";
import { API_URL } from "@/lib/config";
import { fonts, ink, SCREEN_PAD } from "@/lib/theme";
import { Header } from "@/components/Header";
import { Field, Headline, Pill } from "@/components/ui";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!email) return;
    setLoading(true);
    // Reset happens on the web page; the emailed link opens in a browser.
    await authClient
      .requestPasswordReset({
        email,
        redirectTo: `${API_URL}/reset-password`,
      })
      .catch(() => {});
    setLoading(false);
    setSent(true);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ink.paper }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: SCREEN_PAD, gap: 24, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <Header back right={<View style={{ width: 44 }} />} />
          <Headline>{sent ? "Check your\nemail." : "Reset your\npassword."}</Headline>

          {sent ? (
            <>
              <Text
                style={{
                  fontFamily: fonts.regular,
                  fontSize: 14.5,
                  lineHeight: 22,
                  color: ink.textSecondary,
                }}
              >
                If {email} is registered, a reset link is on its way. Open it on
                this phone, choose a new password, then come back and sign in.
                The link expires in 1 hour.
              </Text>
              <Pill
                label="Back to sign in"
                variant="ink"
                onPress={() => router.replace("/login")}
              />
            </>
          ) : (
            <>
              <Text
                style={{
                  fontFamily: fonts.regular,
                  fontSize: 14.5,
                  lineHeight: 22,
                  color: ink.textSecondary,
                }}
              >
                Enter your email and we&apos;ll send a link to set a new password.
              </Text>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <Pill
                label="Send reset link"
                variant="ink"
                arrow
                loading={loading}
                onPress={submit}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
