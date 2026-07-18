import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { api, type ApiClaim, type ApiItem } from "@/lib/api";
import { CLAIM_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { fonts, ink, SCREEN_PAD } from "@/lib/theme";
import { Header } from "@/components/Header";
import {
  Chip,
  ChevronCircle,
  CircleBtn,
  EmptyState,
  Headline,
  ListGroup,
  SectionLabel,
} from "@/components/ui";

interface ClaimEntry {
  claim: ApiClaim;
  item: ApiItem;
}

const OPEN = ["DRAFT", "SUBMITTED", "IN_REVIEW"];

export default function ClaimsScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<ClaimEntry[]>([]);

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: ApiItem[] }>("/api/items");
      const all: ClaimEntry[] = [];
      for (const item of data.items) {
        for (const claim of item.claims) all.push({ claim, item });
      }
      all.sort((a, b) => b.claim.createdAt.localeCompare(a.claim.createdAt));
      setEntries(all);
    } catch {
      // keep last data
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const open = entries.filter((e) => OPEN.includes(e.claim.status));
  const closed = entries.filter((e) => !OPEN.includes(e.claim.status));

  const row = ({ claim, item }: ClaimEntry) => (
    <Pressable
      key={claim.id}
      onPress={() => router.push(`/item/${item.id}/claim`)}
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
          <Chip
            label={CLAIM_STATUS_LABELS[claim.status] ?? claim.status}
            kind={
              claim.status === "APPROVED" || claim.status === "RESOLVED"
                ? "accent"
                : "ink"
            }
            size="sm"
          />
          {claim.claimNumber ? (
            <Chip label={`Ref ${claim.claimNumber}`} size="sm" />
          ) : null}
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
          {claim.issueDescription} · {formatDate(claim.createdAt)}
        </Text>
      </View>
      <ChevronCircle />
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ink.paper }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PAD,
          paddingTop: 10,
          paddingBottom: 120,
          gap: 18,
        }}
      >
        <Header
          title="Claims"
          left={
            <CircleBtn
              icon={<Feather name="bell" size={19} color={ink.ink} />}
              onPress={() => router.push("/alerts")}
            />
          }
        />
        <Headline>When something{"\n"}breaks, be ready.</Headline>

        {entries.length === 0 ? (
          <EmptyState
            title="No claims yet"
            body="Open any item and tap “Build claim package” when something goes wrong — everything you need in one PDF."
          />
        ) : (
          <>
            {open.length > 0 && (
              <View style={{ gap: 12 }}>
                <SectionLabel>In progress</SectionLabel>
                <ListGroup>{open.map(row)}</ListGroup>
              </View>
            )}
            {closed.length > 0 && (
              <View style={{ gap: 12 }}>
                <SectionLabel>Closed</SectionLabel>
                <ListGroup>{closed.map(row)}</ListGroup>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
