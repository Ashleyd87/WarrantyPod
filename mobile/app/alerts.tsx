import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { api, type ApiNotification, type ApiSettings } from "@/lib/api";
import { REMINDER_LEAD_OPTIONS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { fonts, ink, SCREEN_PAD } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import { Header } from "@/components/Header";
import {
  ChipRow,
  EmptyState,
  Field,
  Headline,
  ListGroup,
  Pill,
  SectionLabel,
} from "@/components/ui";

const ICONS: Record<string, { name: string; color: (accent: string) => string }> = {
  EXPIRING_SOON: { name: "warning-outline", color: () => "#B47908" },
  EXPIRED: { name: "time-outline", color: () => "#C03D2E" },
  CLAIM_UPDATE: { name: "document-text-outline", color: (a) => a },
};

export default function AlertsScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [leadDays, setLeadDays] = useState(30);
  const [currency, setCurrency] = useState("USD");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [n, s] = await Promise.all([
        api<{ notifications: ApiNotification[]; unreadCount: number }>(
          "/api/notifications"
        ),
        api<{ settings: ApiSettings }>("/api/settings"),
      ]);
      setNotifications(n.notifications);
      setUnread(n.unreadCount);
      setLeadDays(s.settings.reminderLeadDays);
      setCurrency(s.settings.currency);
    } catch {
      // keep last data
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function open(n: ApiNotification) {
    if (!n.read) {
      api("/api/notifications", {
        method: "POST",
        body: JSON.stringify({ id: n.id }),
      }).catch(() => {});
    }
    router.push(`/item/${n.productItemId}`);
  }

  async function saveSettings() {
    setSaving(true);
    try {
      await api("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ reminderLeadDays: leadDays, currency }),
      });
      Alert.alert("Saved", "Alert preferences updated.");
      load();
    } catch (e) {
      Alert.alert("Save failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ink.paper }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PAD,
          paddingTop: 10,
          paddingBottom: 60,
          gap: 20,
        }}
      >
        <Header title="Expiry alerts" back />
        <Headline>
          {unread ? `${unread} thing${unread === 1 ? "" : "s"} need\nyour eyes.` : "All caught up."}
        </Headline>

        {unread > 0 && (
          <Pill
            label="Mark all read"
            variant="white"
            height={50}
            icon={<Feather name="check-circle" size={17} color={ink.ink} />}
            style={{ borderWidth: 1.5, borderColor: ink.controlBorder }}
            onPress={async () => {
              await api("/api/notifications", {
                method: "POST",
                body: JSON.stringify({ all: true }),
              }).catch(() => {});
              load();
            }}
          />
        )}

        {notifications.length === 0 ? (
          <EmptyState
            title="No alerts"
            body="You'll hear from us here before warranties expire."
          />
        ) : (
          <ListGroup>
            {notifications.map((n) => {
              const meta = ICONS[n.type] ?? ICONS.EXPIRING_SOON;
              return (
                <Pressable
                  key={n.id}
                  onPress={() => open(n)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "flex-start",
                    paddingHorizontal: 12,
                    paddingVertical: 14,
                    borderRadius: 16,
                    gap: 12,
                    backgroundColor: pressed ? ink.pressHighlight : "transparent",
                    opacity: n.read ? 0.55 : 1,
                  })}
                >
                  <Ionicons
                    name={meta.name as never}
                    size={19}
                    color={meta.color(t.accentText)}
                    style={{ marginTop: 2 }}
                  />
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                      <Text
                        style={{
                          fontFamily: fonts.bold,
                          fontSize: 14.5,
                          color: ink.ink,
                          flexShrink: 1,
                        }}
                        numberOfLines={1}
                      >
                        {n.title}
                      </Text>
                      {!n.read && (
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: t.accent,
                          }}
                        />
                      )}
                    </View>
                    <Text
                      style={{
                        fontFamily: fonts.regular,
                        fontSize: 12.5,
                        lineHeight: 18,
                        color: ink.textSecondary,
                      }}
                    >
                      {n.body}
                    </Text>
                    <Text
                      style={{ fontFamily: fonts.regular, fontSize: 11, color: ink.textMuted }}
                    >
                      {formatDate(n.createdAt)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ListGroup>
        )}

        {/* Preferences */}
        <View style={{ gap: 12, marginTop: 8 }}>
          <SectionLabel>Remind me</SectionLabel>
          <ChipRow
            options={REMINDER_LEAD_OPTIONS}
            value={leadDays as (typeof REMINDER_LEAD_OPTIONS)[number]}
            onChange={setLeadDays}
            labels={Object.fromEntries(
              REMINDER_LEAD_OPTIONS.map((d) => [String(d), `${d} days before`])
            )}
          />
          <Field
            label="Default currency"
            value={currency}
            onChangeText={(v) => setCurrency(v.toUpperCase())}
            maxLength={3}
            autoCapitalize="characters"
          />
          <Pill
            label={saving ? "Saving…" : "Save preferences"}
            variant="ink"
            height={50}
            loading={saving}
            onPress={saveSettings}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
