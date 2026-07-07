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

export default function SignupScreen() {
  const router = useRouter();
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
            Create your vault
          </Text>
          <Text style={{ color: colors.muted }}>
            Stop losing money on expired warranties.
          </Text>
        </View>

        <Card style={{ gap: 14 }}>
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
          <Button
            title={loading ? "Creating…" : "Create account"}
            loading={loading}
            onPress={submit}
          />
          <Text style={{ textAlign: "center", color: colors.muted, fontSize: 14 }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: colors.primary, fontWeight: "600" }}>
              Sign in
            </Link>
          </Text>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
