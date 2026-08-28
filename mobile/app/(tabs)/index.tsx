import React, { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { vault, type VaultItemView } from "@/lib/vault";
import { loadSampleProducts } from "@/lib/sample-data";
import { useOwner } from "@/lib/use-owner";
import { formatDate, userInitial } from "@/lib/format";
import { fonts, ink, SCREEN_PAD } from "@/lib/theme";
import { useTour, useTourTarget } from "@/lib/tour-context";
import {
  Avatar,
  Card,
  Chip,
  ChevronCircle,
  CircleBtn,
  Headline,
  ListGroup,
  Pill,
  SectionLabel,
} from "@/components/ui";

const CATEGORY_CARDS = [
  {
    key: "APPLIANCE",
    label: "Appliances",
    icon: <MaterialCommunityIcons name="washing-machine" size={40} color={ink.ink} />,
  },
  {
    key: "ELECTRONICS",
    label: "Electronics",
    icon: <Feather name="tv" size={36} color={ink.ink} />,
  },
  {
    key: "TOOL",
    label: "Tools",
    icon: <Ionicons name="hammer-outline" size={38} color={ink.ink} />,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const owner = useOwner();
  const [items, setItems] = useState<VaultItemView[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const { start: startTour, seen: tourSeen, active: tourActive } = useTour();
  const summaryRef = useTourTarget("home-summary");
  const categoriesRef = useTourTarget("home-categories");
  const expiringRef = useTourTarget("home-expiring");
  const addRef = useTourTarget("home-add");

  // First visit after signing in: run the tour once layout has settled.
  useEffect(() => {
    if (tourSeen() || tourActive) return;
    const id = setTimeout(startTour, 700);
    return () => clearTimeout(id);
  }, [startTour, tourSeen, tourActive]);

  const load = useCallback(async () => {
    try {
      const all = await vault.listItems();
      setItems(all.filter((i) => !i.archived));
    } catch {
      // keep last data
    }
  }, []);

  async function loadSamples() {
    setSeeding(true);
    try {
      await loadSampleProducts();
      await load();
    } catch {
      // ignore
    } finally {
      setSeeding(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const expiring = items
    .filter((i) => i.warranty.status === "EXPIRING_SOON")
    .sort(
      (a, b) => (a.warranty.daysRemaining ?? 0) - (b.warranty.daysRemaining ?? 0)
    );
  const soonList = expiring.length
    ? expiring
    : items
        .filter((i) => i.warranty.status === "ACTIVE")
        .sort(
          (a, b) =>
            (a.warranty.daysRemaining ?? 9e9) - (b.warranty.daysRemaining ?? 9e9)
        );
  const letter = userInitial(owner);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ink.paper }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PAD,
          paddingTop: 10,
          paddingBottom: 120,
          gap: 24,
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
      >
        {/* Header: search · household · avatar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <CircleBtn
            borderless
            icon={<Feather name="search" size={22} color={ink.ink} />}
            onPress={() => router.push("/items?focus=1")}
          />
          <View ref={summaryRef} collapsable={false} style={{ alignItems: "center" }}>
            <Text
              style={{ fontFamily: fonts.medium, fontSize: 11, color: ink.textMuted }}
            >
              Your household
            </Text>
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: ink.ink }}>
              {items.length} item{items.length === 1 ? "" : "s"} protected
            </Text>
          </View>
          <Avatar letter={letter} onPress={() => router.push("/profile")} />
        </View>

        <Headline>Proof for everything{"\n"}you own.</Headline>

        {/* Category */}
        <View style={{ gap: 12 }}>
          <SectionLabel>Category</SectionLabel>
          <View ref={categoriesRef} collapsable={false} style={{ flexDirection: "row", gap: 10 }}>
            {CATEGORY_CARDS.map((c) => (
              <Pressable
                key={c.key}
                onPress={() => router.push(`/items?category=${c.key}`)}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: pressed ? ink.pressHighlight : ink.card,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: ink.cardBorder,
                  paddingTop: 18,
                  paddingBottom: 14,
                  alignItems: "center",
                  gap: 12,
                })}
              >
                {c.icon}
                <Text
                  style={{ fontFamily: fonts.semibold, fontSize: 13, color: ink.ink }}
                >
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Expiring soon */}
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <SectionLabel>Expiring soon</SectionLabel>
            <Pressable onPress={() => router.push("/items?filter=expiring")}>
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontSize: 13,
                  color: ink.ink,
                  textDecorationLine: "underline",
                }}
              >
                View all
              </Text>
            </Pressable>
          </View>

          {soonList.length === 0 ? (
            <Card
              ref={expiringRef}
              collapsable={false}
              style={{ alignItems: "center", gap: 14, paddingVertical: 30 }}
            >
              <Text
                style={{ fontFamily: fonts.extrabold, fontSize: 16, color: ink.ink }}
              >
                Nothing in the vault yet
              </Text>
              <Text
                style={{
                  fontFamily: fonts.regular,
                  fontSize: 13.5,
                  lineHeight: 20,
                  color: ink.textSecondary,
                  textAlign: "center",
                }}
              >
                Snap a receipt and a serial sticker — AI does the data entry.
              </Text>
              <Pressable onPress={loadSamples} disabled={seeding} hitSlop={8}>
                <Text
                  style={{
                    fontFamily: fonts.semibold,
                    fontSize: 13.5,
                    color: ink.ink,
                    textDecorationLine: "underline",
                  }}
                >
                  {seeding ? "Adding samples…" : "or load sample products"}
                </Text>
              </Pressable>
            </Card>
          ) : (
            <ListGroup ref={expiringRef} collapsable={false}>
              {soonList.slice(0, 3).map((item) => {
                const days = item.warranty.daysRemaining;
                return (
                  <Pressable
                    key={item.id}
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
                      <View style={{ flexDirection: "row", gap: 7 }}>
                        {days !== null && (
                          <Chip
                            label={`${days} days`}
                            kind={days <= 30 ? "accent" : "ink"}
                            size="sm"
                          />
                        )}
                        <Chip label={item.category.toLowerCase()} size="sm" />
                      </View>
                      <Text
                        style={{
                          fontFamily: fonts.bold,
                          fontSize: 15,
                          color: ink.ink,
                        }}
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
                        {item.storeName ? `${item.storeName} · ` : ""}warranty ends{" "}
                        {formatDate(item.warrantyExpirationDate)}
                      </Text>
                    </View>
                    <ChevronCircle />
                  </Pressable>
                );
              })}
            </ListGroup>
          )}
        </View>

        {/* Primary action always sits here, so its position never moves. */}
        <View ref={addRef} collapsable={false}>
          <Pill label="Add to vault" arrow onPress={() => router.push("/add")} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
