import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { ApiItem } from "@/lib/api";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";
import { colors, radius } from "@/lib/theme";
import { Badge } from "./ui";

export function warrantyBadge(item: ApiItem) {
  const w = item.warranty;
  switch (w.status) {
    case "ACTIVE":
      return { text: `${w.daysRemaining}d left`, tone: "success" as const };
    case "EXPIRING_SOON":
      return {
        text: w.daysRemaining === 0 ? "Expires today" : `${w.daysRemaining}d left`,
        tone: "warning" as const,
      };
    case "EXPIRED":
      return { text: "Expired", tone: "destructive" as const };
    default:
      return { text: "No warranty", tone: "muted" as const };
  }
}

export function ItemCard({ item }: { item: ApiItem }) {
  const router = useRouter();
  const badge = warrantyBadge(item);

  return (
    <Pressable
      onPress={() => router.push(`/item/${item.id}`)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            <Text style={{ fontWeight: "700" }}>{item.brand}</Text>{" "}
            {item.modelName}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {CATEGORY_LABELS[item.category] ?? item.category}
            {item.purchaseDate ? ` · ${formatDate(item.purchaseDate)}` : ""}
            {item.purchasePrice
              ? ` · ${formatMoney(item.purchasePrice, item.currency)}`
              : ""}
          </Text>
        </View>
        <Badge text={badge.text} tone={badge.tone} />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {item.serialNumber ? (
          <Badge text={item.serialNumber} tone="muted" />
        ) : (
          <Badge text="Missing serial" tone="warning" />
        )}
        {!item.hasReceipt && <Badge text="Missing receipt" tone="warning" />}
        {item.hasOpenClaim && <Badge text="Claim in progress" tone="primary" />}
        {item.archived && <Badge text="Archived" tone="muted" />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  title: { fontSize: 15, color: colors.foreground },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
