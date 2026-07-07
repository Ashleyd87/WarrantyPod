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
import { authClient } from "@/lib/auth-client";
import { colors, radius, spacing } from "@/lib/theme";
import { Button, Card, Field } from "@/components/ui";

export default function LoginScreen() {
  const router = useRouter();
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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: spacing(5),
          gap: spacing(5),
        }}
      >
        <View style={{ alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: radius.lg,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 30 }}>🛡️</Text>
          </View>
          <Text style={{ fontSize: 24, fontWeight: "800", color: colors.foreground }}>
            Warranty Vault
          </Text>
          <Text style={{ color: colors.muted, textAlign: "center" }}>
            Receipts, serials and warranty deadlines — safe in one place.
          </Text>
        </View>

        <Card style={{ gap: 14 }}>
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
          <Button title={loading ? "Signing in…" : "Sign in"} loading={loading} onPress={submit} />
          <Text style={{ textAlign: "center", color: colors.muted, fontSize: 14 }}>
            No account?{" "}
            <Link href="/signup" style={{ color: colors.primary, fontWeight: "600" }}>
              Create one
            </Link>
          </Text>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
