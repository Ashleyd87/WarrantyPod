import React, { useCallback, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { api, apiRaw } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { REMINDER_LEAD_OPTIONS } from "@/lib/constants";
import { colors, spacing } from "@/lib/theme";
import { Button, Card, ChipRow, Field, SectionTitle } from "@/components/ui";

export default function SettingsScreen() {
  const router = useRouter();
  const [leadDays, setLeadDays] = useState<number>(30);
  const [currency, setCurrency] = useState("USD");
  const [email, setEmail] = useState("");
  const [aiMock, setAiMock] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      api<{
        settings: { reminderLeadDays: number; currency: string };
        user: { email: string };
        aiMockMode: boolean;
      }>("/api/settings")
        .then((d) => {
          setLeadDays(d.settings.reminderLeadDays);
          setCurrency(d.settings.currency);
          setEmail(d.user.email);
          setAiMock(d.aiMockMode);
        })
        .catch(() => {});
    }, [])
  );

  async function save() {
    setSaving(true);
    try {
      await api("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ reminderLeadDays: leadDays, currency }),
      });
      Alert.alert("Saved", "Your settings were updated.");
    } catch (e) {
      Alert.alert("Save failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const res = await apiRaw("/api/export/csv");
      const csv = await res.text();
      const dir = new Directory(Paths.cache, "exports");
      if (!dir.exists) dir.create();
      const file = new File(dir, "warranty-vault-export.csv");
      if (file.exists) file.delete();
      file.create();
      file.write(csv);
      await Sharing.shareAsync(file.uri, { mimeType: "text/csv" });
    } catch (e) {
      Alert.alert("Export failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing(4), gap: spacing(4) }}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: "800", color: colors.foreground }}>
            Settings
          </Text>
          <Text style={{ color: colors.muted }}>{email}</Text>
        </View>

        <Card>
          <SectionTitle>Reminders</SectionTitle>
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            How far ahead of a warranty expiry you want to be alerted.
          </Text>
          <ChipRow
            options={REMINDER_LEAD_OPTIONS}
            value={leadDays as (typeof REMINDER_LEAD_OPTIONS)[number]}
            onChange={setLeadDays}
            labels={Object.fromEntries(
              REMINDER_LEAD_OPTIONS.map((d) => [String(d), `${d} days`])
            )}
          />
          <Field
            label="Default currency"
            value={currency}
            onChangeText={(t) => setCurrency(t.toUpperCase())}
            maxLength={3}
            autoCapitalize="characters"
          />
          <Button title={saving ? "Saving…" : "Save settings"} loading={saving} onPress={save} />
        </Card>

        <Card>
          <SectionTitle>AI extraction</SectionTitle>
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            {aiMock
              ? "Demo mode — the server has no ANTHROPIC_API_KEY, so extraction returns sample data. Add the key to the server's .env to go live."
              : "Live — photos are read by Claude when you tap “Extract details with AI”."}
          </Text>
        </Card>

        <Card>
          <SectionTitle>Export</SectionTitle>
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            Your full inventory — serials, purchase and warranty data — as a
            CSV for insurance documentation.
          </Text>
          <Button
            title={exporting ? "Preparing…" : "Export inventory CSV"}
            variant="outline"
            loading={exporting}
            onPress={exportCsv}
          />
        </Card>

        <Button
          title="Sign out"
          variant="outline"
          onPress={async () => {
            await authClient.signOut();
            router.replace("/login");
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
