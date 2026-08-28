import React, { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { vault, type OwnerDetails } from "@/lib/vault";
import { fonts, ink, SCREEN_PAD } from "@/lib/theme";
import { Header } from "@/components/Header";
import { Field, Headline, LoadingScreen, Pill } from "@/components/ui";

/**
 * Claimant details. Entered once and reused on every claim — this is what
 * gets a claim processed rather than bounced back asking who sent it.
 * Stored in the local vault document; never uploaded.
 */
export default function OwnerDetailsScreen() {
  const router = useRouter();
  const [values, setValues] = useState<OwnerDetails | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      vault.settings().then((s) => {
        if (alive) setValues((v) => v ?? s.owner);
      });
      return () => {
        alive = false;
      };
    }, [])
  );

  if (!values) return <LoadingScreen />;

  function set<K extends keyof OwnerDetails>(key: K, value: string) {
    setValues((v) => (v ? { ...v, [key]: value } : v));
  }

  async function save() {
    setSaving(true);
    try {
      await vault.saveSettings({ owner: values! });
      router.back();
    } catch (e) {
      Alert.alert("Save failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ink.paper }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: SCREEN_PAD,
            paddingTop: 10,
            paddingBottom: 60,
            gap: 22,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Header title="Your details" back />
          <Headline>Who the claim{"\n"}comes from.</Headline>
          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: 13.5,
              lineHeight: 20,
              color: ink.textSecondary,
            }}
          >
            These go on the front page of every claim package, so a
            manufacturer can identify you and reply. Saved on this phone only.
          </Text>

          <View style={{ gap: 16 }}>
            <Field
              label="Full name"
              value={values.name}
              onChangeText={(v) => set("name", v)}
              placeholder="Jordan Avery"
              autoCapitalize="words"
            />
            <Field
              label="Email"
              value={values.email}
              onChangeText={(v) => set("email", v)}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Field
              label="Phone"
              value={values.phone}
              onChangeText={(v) => set("phone", v)}
              placeholder="+44 7700 900000"
              keyboardType="phone-pad"
            />
            <Field
              label="Address"
              hint="for collection or replacement"
              value={values.address}
              onChangeText={(v) => set("address", v)}
              placeholder={"12 Example Street\nTown\nAB1 2CD"}
              multiline
              style={{ minHeight: 90, textAlignVertical: "top" }}
            />
          </View>

          <Pill
            label={saving ? "Saving…" : "Save details"}
            variant="ink"
            loading={saving}
            onPress={save}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
