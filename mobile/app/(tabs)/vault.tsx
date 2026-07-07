import React, { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type ApiItem } from "@/lib/api";
import { colors, radius, spacing } from "@/lib/theme";
import { ItemCard } from "@/components/ItemCard";
import { ChipRow, EmptyState } from "@/components/ui";

const FILTERS = ["all", "active", "expiring", "expired", "claims", "archived"] as const;
const FILTER_LABELS: Record<string, string> = {
  all: "All",
  active: "Under warranty",
  expiring: "Expiring soon",
  expired: "Expired",
  claims: "Claims",
  archived: "Archived",
};

export default function VaultScreen() {
  const [items, setItems] = useState<ApiItem[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: ApiItem[] }>("/api/items");
      setItems(data.items);
    } catch {
      // keep last data
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items;
    if (q) {
      list = list.filter((i) =>
        [i.brand, i.modelName, i.serialNumber, i.storeName, i.notes]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q))
      );
    }
    switch (filter) {
      case "active":
        return list.filter(
          (i) =>
            i.warranty.status === "ACTIVE" ||
            i.warranty.status === "EXPIRING_SOON"
        );
      case "expiring":
        return list
          .filter((i) => i.warranty.status === "EXPIRING_SOON")
          .sort(
            (a, b) =>
              (a.warranty.daysRemaining ?? 0) - (b.warranty.daysRemaining ?? 0)
          );
      case "expired":
        return list.filter((i) => i.warranty.status === "EXPIRED");
      case "claims":
        return list.filter((i) => i.hasOpenClaim);
      case "archived":
        return list.filter((i) => i.archived);
      default:
        return list.filter((i) => !i.archived);
    }
  }, [items, search, filter]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <FlatList
        data={visible}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing(4), gap: 10 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <Text style={styles.h1}>Vault</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search brand, model, serial, store…"
              placeholderTextColor={colors.muted}
              style={styles.search}
              autoCapitalize="none"
            />
            <ChipRow
              options={FILTERS}
              value={filter}
              onChange={setFilter}
              labels={FILTER_LABELS}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="Nothing here"
            body={
              search || filter !== "all"
                ? "No products match these filters."
                : "Add your first product from the Add tab."
            }
          />
        }
        renderItem={({ item }) => <ItemCard item={item} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: "800", color: colors.foreground },
  search: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.foreground,
  },
});
