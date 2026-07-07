import React, { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type ApiItem, type ApiSettings } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { formatMoney } from "@/lib/format";
import { colors, radius, spacing } from "@/lib/theme";
import { ItemCard } from "@/components/ItemCard";
import { Button, EmptyState, SectionTitle } from "@/components/ui";

export default function DashboardScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [items, setItems] = useState<ApiItem[]>([]);
  const [settings, setSettings] = useState<ApiSettings | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: ApiItem[]; settings: ApiSettings }>(
        "/api/items"
      );
      setItems(data.items.filter((i) => !i.archived));
      setSettings(data.settings);
    } catch {
      // Pull-to-refresh retries; keep the last good data on screen.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const active = items.filter(
    (i) =>
      i.warranty.status === "ACTIVE" || i.warranty.status === "EXPIRING_SOON"
  );
  const expiring = items
    .filter((i) => i.warranty.status === "EXPIRING_SOON")
    .sort(
      (a, b) => (a.warranty.daysRemaining ?? 0) - (b.warranty.daysRemaining ?? 0)
    );
  const expired = items.filter((i) => i.warranty.status === "EXPIRED");
  const protectedValue = active.reduce(
    (sum, i) => sum + (i.purchasePrice ? Number(i.purchasePrice) : 0),
    0
  );
  const needsAttention = items.filter((i) => !i.hasReceipt || !i.serialNumber);

  const stats = [
    { label: "Products", value: String(items.length) },
    {
      label: "Protected value",
      value: formatMoney(protectedValue, settings?.currency ?? "USD"),
    },
    {
      label: `Expiring ≤ ${settings?.reminderLeadDays ?? 30}d`,
      value: String(expiring.length),
      tone: colors.warning,
    },
    { label: "Expired", value: String(expired.length), tone: colors.destructive },
  ];

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: spacing(4), gap: spacing(5) }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <View>
          <Text style={styles.h1}>
            Hi {session?.user.name?.split(" ")[0] || "there"}
          </Text>
          <Text style={{ color: colors.muted }}>
            Here&apos;s how your vault is looking.
          </Text>
        </View>

        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statValue, s.tone ? { color: s.tone } : null]}>
                {s.value}
              </Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {items.length === 0 ? (
          <View style={{ gap: 12 }}>
            <EmptyState
              title="Your vault is empty"
              body="Photograph a receipt and a serial sticker — the AI does the data entry, and you'll never lose a warranty again."
            />
            <Button
              title="Add your first product"
              onPress={() => router.push("/add")}
            />
          </View>
        ) : (
          <>
            {expiring.length > 0 && (
              <View style={{ gap: 10 }}>
                <SectionTitle>Expiring soon</SectionTitle>
                {expiring.slice(0, 4).map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </View>
            )}
            {needsAttention.length > 0 && (
              <View style={{ gap: 10 }}>
                <SectionTitle>Missing evidence</SectionTitle>
                <Text style={{ color: colors.muted, fontSize: 13, marginTop: -6 }}>
                  A claim without a receipt or serial usually fails.
                </Text>
                {needsAttention.slice(0, 3).map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </View>
            )}
            <View style={{ gap: 10 }}>
              <SectionTitle>Recently added</SectionTitle>
              {items.slice(0, 4).map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: "800", color: colors.foreground },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    gap: 2,
  },
  statValue: { fontSize: 20, fontWeight: "800", color: colors.foreground },
  statLabel: { fontSize: 12, color: colors.muted },
});
