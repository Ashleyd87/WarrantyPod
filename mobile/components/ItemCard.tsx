import React from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { ApiItem } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { fonts, ink } from "@/lib/theme";
import { Chip, ChevronCircle } from "./ui";

/** S1-style list row: chips line, 15/700 title, 12.5 sub, chevron circle. */
export function ItemRow({ item }: { item: ApiItem }) {
  const router = useRouter();
  const days = item.warranty.daysRemaining;
  const status = item.warranty.status;

  const sub =
    status === "EXPIRED"
      ? `${item.storeName ? `${item.storeName} · ` : ""}warranty ended ${formatDate(item.warrantyExpirationDate)}`
      : item.warrantyExpirationDate
        ? `${item.storeName ? `${item.storeName} · ` : ""}warranty ends ${formatDate(item.warrantyExpirationDate)}`
        : `${item.storeName ? `${item.storeName} · ` : ""}${
            item.purchasePrice
              ? formatMoney(item.purchasePrice, item.currency)
              : "no warranty info"
          }`;

  return (
    <Pressable
      onPress={() => router.push(`/item/${item.id}`)}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: pressed ? ink.pressHighlight : "transparent",
        gap: 10,
      })}
    >
      <View style={{ flex: 1, gap: 7 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
          {status === "EXPIRED" ? (
            <Chip label="Expired" kind="ink" size="sm" />
          ) : days !== null ? (
            <Chip
              label={`${days} days`}
              kind={days <= 30 ? "accent" : "ink"}
              size="sm"
            />
          ) : null}
          <Chip label={item.category.toLowerCase()} size="sm" />
          {item.hasOpenClaim && <Chip label="claim" kind="accent" size="sm" />}
          {item.archived && <Chip label="archived" size="sm" />}
        </View>
        <Text
          style={{ fontFamily: fonts.bold, fontSize: 15, color: ink.ink }}
          numberOfLines={1}
        >
          {item.brand} {item.modelName}
        </Text>
        <Text
          style={{
            fontFamily: fonts.regular,
            fontSize: 12.5,
            color: ink.textSecondary,
          }}
          numberOfLines={1}
        >
          {sub}
        </Text>
      </View>
      <ChevronCircle />
    </Pressable>
  );
}
