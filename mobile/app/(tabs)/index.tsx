import React, { useCallback, useState } from "react";
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
import { api, type ApiItem } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { formatDate } from "@/lib/format";
import { fonts, ink, SCREEN_PAD } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
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
  const { t } = useTheme();
  const { data: session } = authClient.useSession();
  const [items, setItems] = useState<ApiItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: ApiItem[] }>("/api/items");
      setItems(data.items.filter((i) => !i.archived));
    } catch {
      // keep last data
    }
  }, []);

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
  const letter = (session?.user.name || session?.user.email || "?").charAt(0);

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
            onPress={() => router.push("/items")}
          />
          <View style={{ alignItems: "center" }}>
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
          <View style={{ flexDirection: "row", gap: 10 }}>
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
                  fontFamily: fonts.semibold,
                  fontSize: 13,
                  color: t.accentText,
                }}
              >
                View all
              </Text>
            </Pressable>
          </View>

          {soonList.length === 0 ? (
            <Card style={{ alignItems: "center", gap: 14, paddingVertical: 30 }}>
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
              <Pill
                label="Add to vault"
                arrow
                height={50}
                onPress={() => router.push("/add")}
              />
            </Card>
          ) : (
            <ListGroup>
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

        {items.length > 0 && (
          <Pill label="Add to vault" arrow onPress={() => router.push("/add")} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
