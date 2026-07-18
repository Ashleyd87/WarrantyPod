import React, { useCallback, useMemo, useState } from "react";
import { FlatList, TextInput, View } from "react-native";
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
  ListGroup,
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
  const params = useLocalSearchParams<{ category?: string; filter?: string }>();
  const [items, setItems] = useState<ApiItem[]>([]);
  const [search, setSearch] = useState("");
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
      load();
    }, [load, params.filter, params.category])
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ink.paper }} edges={["top"]}>
      <FlatList
        data={[0]}
        keyExtractor={() => "list"}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PAD,
          paddingTop: 10,
          paddingBottom: 120,
        }}
        renderItem={() => (
          <View style={{ gap: 18 }}>
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
              value={search}
              onChangeText={setSearch}
              placeholder="Search brand, model, serial, store…"
              placeholderTextColor={ink.textMuted}
              autoCapitalize="none"
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
            {visible.length === 0 ? (
              <EmptyState
                title="Nothing here"
                body={
                  search || filter !== "all" || category
                    ? "No items match these filters."
                    : "Add your first product with the + button."
                }
              />
            ) : (
              <ListGroup>
                {visible.map((item) => (
                  <ItemRow key={item.id} item={item} />
                ))}
              </ListGroup>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}
