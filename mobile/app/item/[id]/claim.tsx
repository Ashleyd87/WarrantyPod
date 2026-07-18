import React, { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { api, apiRaw, type ApiClaim, type ApiItem } from "@/lib/api";
import { CLAIM_STATUSES, CLAIM_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";
import { fonts, ink, SCREEN_PAD } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import { Header } from "@/components/Header";
import {
  Chip,
  ChipRow,
  CircleBtn,
  ListGroup,
  LoadingScreen,
  Mono,
  Pill,
  SectionLabel,
} from "@/components/ui";

const ASSET_ICONS: Record<string, React.ReactNode> = {
  RECEIPT: <Feather name="file-text" size={18} color={ink.ink} />,
  SERIAL_STICKER: <Ionicons name="barcode-outline" size={19} color={ink.ink} />,
  WARRANTY_CARD: <Ionicons name="shield-outline" size={18} color={ink.ink} />,
  PRODUCT_PHOTO: <Feather name="image" size={18} color={ink.ink} />,
  MANUAL: <Feather name="book-open" size={18} color={ink.ink} />,
  OTHER: <Feather name="file" size={18} color={ink.ink} />,
};

const ASSET_TITLES: Record<string, string> = {
  RECEIPT: "Receipt",
  SERIAL_STICKER: "Serial sticker photo",
  WARRANTY_CARD: "Warranty terms",
  PRODUCT_PHOTO: "Product photo",
  MANUAL: "Manual",
  OTHER: "Attachment",
};

const OPEN = ["DRAFT", "SUBMITTED", "IN_REVIEW"];

export default function ClaimBuilderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTheme();
  const [item, setItem] = useState<ApiItem | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [issue, setIssue] = useState("");
  const [exporting, setExporting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ item: ApiItem }>(`/api/items/${id}`);
      setItem(data.item);
      if (!loaded) {
        setSelected(new Set(data.item.assets.map((a) => a.id)));
        const open = data.item.claims.find((c) => OPEN.includes(c.status));
        if (open) setIssue(open.issueDescription);
        setLoaded(true);
      }
    } catch {
      router.back();
    }
  }, [id, router, loaded]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!item) return <LoadingScreen />;

  const w = item.warranty;
  const inWarranty = w.status === "ACTIVE" || w.status === "EXPIRING_SOON";
  const openClaim: ApiClaim | undefined = item.claims.find((c) =>
    OPEN.includes(c.status)
  );

  function toggle(assetId: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  }

  async function ensureClaim(): Promise<void> {
    const text = issue.trim();
    if (!text) return;
    if (openClaim) {
      if (openClaim.issueDescription !== text) {
        await api(`/api/claims/${openClaim.id}`, {
          method: "PATCH",
          body: JSON.stringify({ issueDescription: text, status: openClaim.status }),
        });
      }
    } else {
      await api(`/api/items/${item!.id}/claims`, {
        method: "POST",
        body: JSON.stringify({ issueDescription: text, status: "DRAFT" }),
      });
    }
  }

  async function exportPdf(share: boolean) {
    setExporting(true);
    try {
      await ensureClaim();
      const assetsParam = [...selected].join(",");
      const res = await apiRaw(
        `/api/items/${item!.id}/claim-package?assets=${encodeURIComponent(assetsParam)}`
      );
      const bytes = new Uint8Array(await res.arrayBuffer());
      const dir = new Directory(Paths.cache, "exports");
      if (!dir.exists) dir.create();
      const file = new File(dir, "claim-package.pdf");
      if (file.exists) file.delete();
      file.create();
      file.write(bytes);
      if (share) {
        await Sharing.shareAsync(file.uri, { mimeType: "application/pdf" });
      }
      load();
    } catch (e) {
      Alert.alert("Export failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setExporting(false);
    }
  }

  async function setClaimStatus(status: string) {
    if (!openClaim && !item!.claims[0]) return;
    const claim = openClaim ?? item!.claims[0];
    try {
      await api(`/api/claims/${claim.id}`, {
        method: "PATCH",
        body: JSON.stringify({ issueDescription: claim.issueDescription, status }),
      });
      load();
    } catch (e) {
      Alert.alert("Update failed", e instanceof Error ? e.message : "Try again.");
    }
  }

  const latestClaim = openClaim ?? item.claims[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ink.paper }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: SCREEN_PAD,
            paddingTop: 10,
            paddingBottom: 140,
            gap: 20,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Header title="Claim package" back />

          {/* Summary card (ink) */}
          <View style={{ backgroundColor: ink.ink, borderRadius: 22, padding: 20, gap: 14 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={{
                    fontFamily: fonts.extrabold,
                    fontSize: 19,
                    letterSpacing: -0.3,
                    color: "#FFFFFF",
                  }}
                >
                  {item.brand} {item.modelName}
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.regular,
                    fontSize: 13,
                    color: ink.onInkSecondary,
                  }}
                >
                  {[
                    item.storeName,
                    item.purchaseDate ? formatDate(item.purchaseDate) : null,
                    item.purchasePrice
                      ? formatMoney(item.purchasePrice, item.currency)
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
              <Chip
                label={inWarranty ? "In warranty" : w.status === "EXPIRED" ? "Expired" : "No warranty"}
                kind={inWarranty ? "accent" : "outline"}
                onInk
              />
            </View>
            <View style={{ height: 1, backgroundColor: ink.onInkBorder }} />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Mono size={14} color="#FFFFFF">
                S/N {item.serialNumber ?? "—"}
              </Mono>
              {w.daysRemaining !== null && w.status !== "EXPIRED" && (
                <Text
                  style={{ fontFamily: fonts.bold, fontSize: 13, color: t.tintOnInk }}
                >
                  {w.daysRemaining} days left
                </Text>
              )}
            </View>
          </View>

          {/* Included proof */}
          <View style={{ gap: 12 }}>
            <SectionLabel>Included proof</SectionLabel>
            {item.assets.length === 0 ? (
              <Text
                style={{
                  fontFamily: fonts.regular,
                  fontSize: 13.5,
                  color: ink.textSecondary,
                }}
              >
                No photos attached yet — add a receipt and serial photo from the
                item page so the claim has evidence.
              </Text>
            ) : (
              <ListGroup>
                {item.assets.map((a) => {
                  const on = selected.has(a.id);
                  return (
                    <Pressable
                      key={a.id}
                      onPress={() => toggle(a.id)}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 12,
                        paddingVertical: 13,
                        borderRadius: 16,
                        backgroundColor: pressed ? ink.pressHighlight : "transparent",
                        gap: 13,
                      })}
                    >
                      <View
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          backgroundColor: ink.paper,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {ASSET_ICONS[a.type] ?? ASSET_ICONS.OTHER}
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={{ fontFamily: fonts.bold, fontSize: 15, color: ink.ink }}
                        >
                          {ASSET_TITLES[a.type] ?? "Attachment"}
                        </Text>
                        <Text
                          style={{
                            fontFamily: fonts.regular,
                            fontSize: 12.5,
                            color: ink.textSecondary,
                          }}
                          numberOfLines={1}
                        >
                          {a.fileName}
                        </Text>
                      </View>
                      <View
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: on ? t.accent : "transparent",
                          borderWidth: on ? 0 : 1.5,
                          borderColor: ink.chipBorder,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {on && <Feather name="check" size={14} color={t.onAccent} />}
                      </View>
                    </Pressable>
                  );
                })}
              </ListGroup>
            )}
          </View>

          {/* Issue */}
          <View style={{ gap: 12 }}>
            <SectionLabel>What went wrong?</SectionLabel>
            <TextInput
              value={issue}
              onChangeText={setIssue}
              multiline
              placeholder="Screen flickers on the left edge after ~10 minutes of use. Started July 2."
              placeholderTextColor={ink.textMuted}
              selectionColor={t.accent}
              style={{
                borderWidth: 1.5,
                borderColor: ink.controlBorder,
                borderRadius: 18,
                minHeight: 110,
                padding: 15,
                fontFamily: fonts.regular,
                fontSize: 14,
                lineHeight: 21,
                color: ink.ink,
                textAlignVertical: "top",
              }}
            />
          </View>

          {/* Claim status (once a claim exists) */}
          {latestClaim && (
            <View style={{ gap: 12 }}>
              <SectionLabel>Claim status</SectionLabel>
              <ChipRow
                options={CLAIM_STATUSES}
                value={latestClaim.status as (typeof CLAIM_STATUSES)[number]}
                onChange={(s) => setClaimStatus(s)}
                labels={CLAIM_STATUS_LABELS}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <SafeAreaView
        edges={["bottom"]}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: ink.paper,
          paddingHorizontal: SCREEN_PAD,
          paddingTop: 10,
        }}
      >
        <View style={{ flexDirection: "row", gap: 12, paddingBottom: 8 }}>
          <CircleBtn
            size={56}
            icon={<Feather name="mail" size={20} color={ink.ink} />}
            onPress={() => exportPdf(true)}
          />
          <Pill
            label={exporting ? "Building…" : "Export claim PDF"}
            arrow
            loading={exporting}
            style={{ flex: 1 }}
            onPress={() => exportPdf(true)}
          />
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}
