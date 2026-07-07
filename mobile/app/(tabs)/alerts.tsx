import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, type ApiNotification } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { colors, radius, spacing } from "@/lib/theme";
import { Button, EmptyState } from "@/components/ui";

const ICONS: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  EXPIRING_SOON: { name: "warning-outline", color: colors.warning },
  EXPIRED: { name: "time-outline", color: colors.destructive },
  CLAIM_UPDATE: { name: "document-text-outline", color: colors.primary },
};

export default function AlertsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await api<{
        notifications: ApiNotification[];
        unreadCount: number;
      }>("/api/notifications");
      setNotifications(data.notifications);
      setUnread(data.unreadCount);
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

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: spacing(4), gap: 10 }}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 4 }}>
            <Text style={styles.h1}>Alerts</Text>
            <Text style={{ color: colors.muted, marginTop: -6 }}>
              {unread ? `${unread} unread` : "All caught up"}
            </Text>
            {unread > 0 && (
              <Button
                title="Mark all read"
                variant="outline"
                onPress={async () => {
                  await api("/api/notifications", {
                    method: "POST",
                    body: JSON.stringify({ all: true }),
                  }).catch(() => {});
                  load();
                }}
              />
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No alerts"
            body="You'll be notified here before warranties expire. Set your lead time in Settings."
          />
        }
        renderItem={({ item: n }) => {
          const icon = ICONS[n.type] ?? ICONS.EXPIRING_SOON;
          return (
            <Pressable
              onPress={() => open(n)}
              style={[styles.row, n.read && { opacity: 0.6 }]}
            >
              <Ionicons name={icon.name} size={20} color={icon.color} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.title} numberOfLines={1}>
                    {n.title}
                  </Text>
                  {!n.read && <View style={styles.dot} />}
                </View>
                <Text style={{ color: colors.muted, fontSize: 13 }}>{n.body}</Text>
                <Text style={{ color: colors.muted, fontSize: 11 }}>
                  {formatDate(n.createdAt)}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: "800", color: colors.foreground },
  row: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
  },
  title: {
    fontWeight: "700",
    color: colors.foreground,
    fontSize: 14,
    flexShrink: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
