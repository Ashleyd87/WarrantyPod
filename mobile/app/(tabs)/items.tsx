import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { api, type ApiItem } from "@/lib/api";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
import { fonts, ink, SCREEN_PAD } from "@/lib/theme";
import { Header } from "@/components/Header";
import { ItemRow } from "@/components/ItemCard";
import {
  ChipRow,
  CircleBtn,
  EmptyState,
  Headline,
  Pill,
} from "@/components/ui";

const FILTERS = ["all", "active", "expiring", "expired", "claims", "archived"] as const;
const FILTER_LABELS: Record<string, string> = {
  all: "All",
  active: "Under warranty",
  expiring: "Expiring soon",
  expired: "Expired",
  claims: "Claims",
  archived: "Archived",
};

export default function ItemsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    category?: string;
    filter?: string;
    focus?: string;
  }>();
  const [items, setItems] = useState<ApiItem[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const searchRef = useRef<TextInput>(null);
  const focusedOnce = useRef(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>(
    FILTERS.includes(params.filter as never)
      ? (params.filter as (typeof FILTERS)[number])
      : "all"
  );
  const [category, setCategory] = useState<string>(
    CATEGORIES.includes(params.category as never) ? params.category! : ""
  );

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
      // Adopt navigation params on each focus (Home category cards / View all).
      if (params.filter && FILTERS.includes(params.filter as never)) {
        setFilter(params.filter as (typeof FILTERS)[number]);
      }
      if (params.category && CATEGORIES.includes(params.category as never)) {
        setCategory(params.category);
      }
      // Arriving from Home's search button lands with the keyboard already up.
      if (params.focus === "1" && !focusedOnce.current) {
        focusedOnce.current = true;
        setTimeout(() => searchRef.current?.focus(), 350);
      }
      load();
    }, [load, params.filter, params.category, params.focus])
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items;
    if (category) list = list.filter((i) => i.category === category);
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
  }, [items, search, filter, category]);

  const filtered = filter !== "all" || category !== "";

  const clearFilters = useCallback(() => {
    setFilter("all");
    setCategory("");
    setSearch("");
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ink.paper }} edges={["top"]}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PAD,
          paddingTop: 10,
          paddingBottom: 120,
        }}
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
        ListHeaderComponent={
          <View style={{ gap: 18, paddingBottom: 18 }}>
            <Header
              title="Items"
              left={
                <CircleBtn
                  icon={<Feather name="plus" size={20} color={ink.ink} />}
                  onPress={() => router.push("/add")}
                />
              }
            />
            <Headline>
              {category
                ? CATEGORY_LABELS[category]
                : "Everything\nin the vault."}
            </Headline>
            <TextInput
              ref={searchRef}
              value={search}
              onChangeText={setSearch}
              placeholder="Search brand, model, serial, store…"
              placeholderTextColor={ink.textMuted}
              autoCapitalize="none"
              returnKeyType="search"
              clearButtonMode="while-editing"
              style={{
                borderWidth: 1.5,
                borderColor: ink.controlBorder,
                borderRadius: 999,
                paddingHorizontal: 18,
                paddingVertical: 13,
                fontFamily: fonts.medium,
                fontSize: 14.5,
                color: ink.ink,
                backgroundColor: ink.paper,
              }}
            />
            <ChipRow
              options={["", ...CATEGORIES] as readonly string[]}
              value={category}
              onChange={(v) => setCategory(v)}
              labels={{ "": "All categories", ...CATEGORY_LABELS }}
            />
            <ChipRow
              options={FILTERS}
              value={filter}
              onChange={setFilter}
              labels={FILTER_LABELS}
            />
            {/* One tap back to the unfiltered vault. */}
            {(filtered || search.length > 0) && (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <Text
                  style={{
                    fontFamily: fonts.regular,
                    fontSize: 12.5,
                    color: ink.textSecondary,
                  }}
                >
                  {visible.length} {visible.length === 1 ? "result" : "results"}
                </Text>
                <View style={{ flex: 1 }} />
                <Pressable onPress={clearFilters} hitSlop={8}>
                  <Text
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 12.5,
                      color: ink.ink,
                      textDecorationLine: "underline",
                    }}
                  >
                    Clear filters
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={{ gap: 14 }}>
            <EmptyState
              title="Nothing here"
              body={
                filtered || search
                  ? "No items match these filters."
                  : "Your vault is empty. Add your first product to start tracking its warranty."
              }
            />
            {filtered || search ? (
              <Pill label="Clear filters" variant="white" height={50} onPress={clearFilters} />
            ) : (
              <Pill
                label="Add to vault"
                arrow
                height={50}
                onPress={() => router.push("/add")}
              />
            )}
          </View>
        }
        ItemSeparatorComponent={() => (
          <View
            style={{
              height: 1,
              backgroundColor: ink.hairline,
              marginHorizontal: 12,
            }}
          />
        )}
        renderItem={({ item, index }) => (
          <View
            style={{
              backgroundColor: ink.card,
              paddingHorizontal: 6,
              paddingTop: index === 0 ? 6 : 0,
              paddingBottom: index === visible.length - 1 ? 6 : 0,
              borderTopLeftRadius: index === 0 ? 22 : 0,
              borderTopRightRadius: index === 0 ? 22 : 0,
              borderBottomLeftRadius: index === visible.length - 1 ? 22 : 0,
              borderBottomRightRadius: index === visible.length - 1 ? 22 : 0,
            }}
          >
            <ItemRow item={item} />
          </View>
        )}
      />
    </SafeAreaView>
  );
}
