import React, { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import {
  api,
  authHeaders,
  fileUrl,
  filePart,
  type ApiItem,
} from "@/lib/api";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";
import { fonts, ink, SCREEN_PAD } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import {
  AddTile,
  Chip,
  CircleBtn,
  LoadingScreen,
  Mono,
  Overline,
  Pill,
  ProgressBar,
  SectionLabel,
} from "@/components/ui";

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<ApiItem | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await api<{ item: ApiItem }>(`/api/items/${id}`);
      setItem(data.item);
    } catch {
      Alert.alert("Not found", "This product no longer exists.");
      router.back();
    }
  }, [id, router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!item) return <LoadingScreen />;

  const w = item.warranty;
  const images = item.assets.filter((a) => a.mimeType.startsWith("image/"));
  const hero = images[Math.min(photoIndex, Math.max(0, images.length - 1))];
  const statusLabel =
    w.status === "EXPIRED"
      ? "Expired"
      : w.status === "NO_WARRANTY"
        ? "No warranty"
        : "Active";

  async function copySerial() {
    if (!item?.serialNumber) return;
    await Clipboard.setStringAsync(item.serialNumber);
    Alert.alert("Copied", "Serial number copied to clipboard.");
  }

  async function addPhoto() {
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: "images", quality: 0.55 });
    if (r.canceled || !r.assets?.[0]) return;
    const fd = new FormData();
    fd.append("assetFile", filePart(r.assets[0].uri, "photo.jpg"));
    fd.append("assetType", "PRODUCT_PHOTO");
    try {
      await api(`/api/items/${item!.id}/assets`, { method: "POST", body: fd });
      load();
    } catch (e) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Try again.");
    }
  }

  function moreActions() {
    Alert.alert(`${item!.brand} ${item!.modelName}`, undefined, [
      { text: "Edit details", onPress: () => router.push(`/item/${item!.id}/edit`) },
      {
        text: item!.archived ? "Restore from archive" : "Archive",
        onPress: async () => {
          await api(`/api/items/${item!.id}/archive`, { method: "POST" });
          load();
        },
      },
      {
        text: "Delete permanently",
        style: "destructive",
        onPress: () =>
          Alert.alert("Delete this item?", "Photos and claim history are removed too.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                await api(`/api/items/${item!.id}`, { method: "DELETE" });
                router.back();
              },
            },
          ]),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: ink.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        {/* Photo header */}
        <View style={{ height: 260, backgroundColor: ink.placeholder }}>
          {hero ? (
            <Pressable
              style={{ flex: 1 }}
              onPress={() =>
                images.length > 1 && setPhotoIndex((i) => (i + 1) % images.length)
              }
            >
              <Image
                source={{ uri: fileUrl(hero.id), headers: authHeaders() }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </Pressable>
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Mono size={11} color={ink.placeholderText}>
                [ product photo — {item.brand} ]
              </Mono>
            </View>
          )}
          <View
            style={{
              position: "absolute",
              top: insets.top + 8,
              left: SCREEN_PAD,
              right: SCREEN_PAD,
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <CircleBtn
              filled
              icon={<Feather name="chevron-left" size={20} color={ink.ink} />}
              onPress={() => router.back()}
            />
            <CircleBtn
              filled
              icon={<Feather name="more-horizontal" size={20} color={ink.ink} />}
              onPress={moreActions}
            />
          </View>
          {images.length > 0 && (
            <View
              style={{
                position: "absolute",
                right: SCREEN_PAD,
                bottom: 14,
                backgroundColor: ink.paper,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Mono size={11}>
                photo {Math.min(photoIndex + 1, images.length)} / {images.length}
              </Mono>
            </View>
          )}
        </View>

        <View style={{ paddingHorizontal: SCREEN_PAD, paddingTop: 18, gap: 18 }}>
          {/* Chips */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Chip label={CATEGORY_LABELS[item.category] ?? item.category} kind="ink" />
            {item.warrantyDurationMonths ? (
              <Chip
                label={
                  item.warrantyDurationMonths % 12 === 0
                    ? `${item.warrantyDurationMonths / 12}-yr warranty`
                    : `${item.warrantyDurationMonths}-mo warranty`
                }
                kind="ink"
              />
            ) : null}
            <Chip
              label={statusLabel}
              kind={w.status === "ACTIVE" || w.status === "EXPIRING_SOON" ? "accent" : "outline"}
            />
          </View>

          {/* Title */}
          <View style={{ gap: 6 }}>
            <Text
              style={{
                fontFamily: fonts.extrabold,
                fontSize: 26,
                letterSpacing: -0.4,
                color: ink.ink,
              }}
            >
              {item.brand} {item.modelName}
            </Text>
            <Text
              style={{ fontFamily: fonts.regular, fontSize: 14, color: ink.textSecondary }}
            >
              {[
                item.storeName,
                item.purchaseDate ? formatDate(item.purchaseDate) : null,
                item.purchasePrice ? formatMoney(item.purchasePrice, item.currency) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>

          {/* Serial card */}
          {item.serialNumber ? (
            <View
              style={{
                backgroundColor: ink.ink,
                borderRadius: 18,
                padding: 18,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View style={{ flex: 1, gap: 7 }}>
                <Overline color={ink.onInkSecondary}>Serial number</Overline>
                <Mono size={17} color="#FFFFFF" weight="medium">
                  {item.serialNumber}
                </Mono>
              </View>
              <Pressable
                onPress={copySerial}
                style={({ pressed }) => ({
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  borderWidth: 1.5,
                  borderColor: ink.onInkBorder,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Feather name="copy" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : null}

          {/* Warranty */}
          {w.status !== "NO_WARRANTY" && (
            <View style={{ gap: 10 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <SectionLabel>Warranty</SectionLabel>
                <Text
                  style={{
                    fontFamily: fonts.bold,
                    fontSize: 13,
                    color: w.status === "EXPIRED" ? ink.textSecondary : t.accentText,
                  }}
                >
                  {w.status === "EXPIRED"
                    ? "expired"
                    : `${w.daysRemaining} days left`}
                </Text>
              </View>
              <ProgressBar fraction={w.fractionElapsed ?? 1} />
              <Text
                style={{ fontFamily: fonts.regular, fontSize: 12.5, color: ink.textSecondary }}
              >
                {w.status === "EXPIRED" ? "Expired" : "Expires"}{" "}
                {formatDate(item.warrantyExpirationDate)}
                {item.warrantyProvider ? ` · ${item.warrantyProvider}` : ""}
                {item.warrantyAssumed ? " · duration assumed" : ""}
              </Text>
            </View>
          )}

          {/* Proof gallery */}
          <View style={{ gap: 12 }}>
            <SectionLabel>Proof</SectionLabel>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {item.assets.map((a) => (
                <Pressable
                  key={a.id}
                  onLongPress={() =>
                    Alert.alert("Remove this photo?", undefined, [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Remove",
                        style: "destructive",
                        onPress: async () => {
                          await api(`/api/assets/${a.id}`, { method: "DELETE" });
                          load();
                        },
                      },
                    ])
                  }
                  style={{ width: 98, gap: 4 }}
                >
                  <Image
                    source={{ uri: fileUrl(a.id), headers: authHeaders() }}
                    style={{
                      width: 98,
                      height: 72,
                      borderRadius: 14,
                      backgroundColor: ink.placeholder,
                    }}
                  />
                  <Mono size={9} color={ink.placeholderText}>
                    {a.type.toLowerCase().replace("_", "-")}.jpg
                  </Mono>
                </Pressable>
              ))}
              <AddTile width={98} height={72} onPress={addPhoto} />
            </View>
          </View>

          {item.notes ? (
            <View style={{ gap: 8 }}>
              <SectionLabel>Notes</SectionLabel>
              <Text
                style={{
                  fontFamily: fonts.regular,
                  fontSize: 13.5,
                  lineHeight: 20,
                  color: ink.textSecondary,
                }}
              >
                {item.notes}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Footer CTA */}
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
            icon={<Feather name="file-text" size={21} color={ink.ink} />}
            onPress={() => router.push(`/item/${item.id}/claim`)}
          />
          <Pill
            label="Build claim package"
            style={{ flex: 1 }}
            onPress={() => router.push(`/item/${item.id}/claim`)}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
