import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { api } from "@/lib/api";
import { assetUri, vault, type VaultItemView } from "@/lib/vault";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";
import { fonts, ink, SCREEN_PAD } from "@/lib/theme";
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
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<VaultItemView | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [webImage, setWebImage] = useState<string | null>(null);
  const [findingImage, setFindingImage] = useState(false);
  const [webImageFailed, setWebImageFailed] = useState(false);
  const lookupRan = useRef(false);

  const load = useCallback(async () => {
    try {
      const found = await vault.getItem(id);
      if (!found) throw new Error("gone");
      setItem(found);
      return found;
    } catch {
      Alert.alert("Not found", "This product no longer exists.");
      router.back();
      return null;
    }
  }, [id, router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  /**
   * No photo of their own? Look one up in the background, once per screen.
   * Purely illustrative — a real photo the user takes always replaces it.
   */
  useEffect(() => {
    if (!item || lookupRan.current) return;
    const ownPhoto = item.assets.some(
      (a) => a.type === "PRODUCT_PHOTO" && a.mimeType.startsWith("image/")
    );
    if (ownPhoto) return;
    if (item.imageUrl) {
      setWebImage(item.imageUrl);
      return;
    }
    lookupRan.current = true;
    setFindingImage(true);
    api<{ imageUrl: string | null }>("/api/product-image", {
      method: "POST",
      body: JSON.stringify({
        brand: item.brand,
        modelName: item.modelName,
        category: item.category,
        barcode: item.barcode,
      }),
    })
      .then((r) => {
        setWebImage(r.imageUrl);
        // Remember it so reopening the item doesn't hit the network again.
        if (r.imageUrl) {
          vault
            .updateItem(item.id, {
              imageUrl: r.imageUrl,
              imageSource: "WEB",
              imageCheckedAt: new Date().toISOString(),
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setFindingImage(false));
  }, [item]);

  if (!item) return <LoadingScreen />;

  const w = item.warranty;
  // The user's own product photo leads; receipts and stickers come after.
  const images = item.assets
    .filter((a) => a.mimeType.startsWith("image/"))
    .sort((a, b) =>
      a.type === "PRODUCT_PHOTO" ? -1 : b.type === "PRODUCT_PHOTO" ? 1 : 0
    );
  const hero = images[Math.min(photoIndex, Math.max(0, images.length - 1))];
  const showWebImage = !hero && Boolean(webImage) && !webImageFailed;
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

  async function uploadPhoto(uri: string, assetType: string) {
    try {
      await vault.addAsset(item!.id, uri, assetType);
      // A real photo supersedes any stock image.
      setWebImage(null);
      setPhotoIndex(0);
      load();
    } catch (e) {
      Alert.alert("Saving failed", e instanceof Error ? e.message : "Try again.");
    }
  }

  async function addPhoto() {
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: "images", quality: 0.55 });
    if (r.canceled || !r.assets?.[0]) return;
    await uploadPhoto(r.assets[0].uri, "PRODUCT_PHOTO");
  }

  /** Camera or library, so the hero can be a photo they already have. */
  function takeProductPhoto() {
    Alert.alert("Photo of this item", "This becomes the picture on this page.", [
      {
        text: "Take photo",
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) return;
          const r = await ImagePicker.launchCameraAsync({
            mediaTypes: "images",
            quality: 0.55,
          });
          if (!r.canceled && r.assets?.[0]) {
            await uploadPhoto(r.assets[0].uri, "PRODUCT_PHOTO");
          }
        },
      },
      {
        text: "Choose from library",
        onPress: async () => {
          const r = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: "images",
            quality: 0.55,
          });
          if (!r.canceled && r.assets?.[0]) {
            await uploadPhoto(r.assets[0].uri, "PRODUCT_PHOTO");
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function moreActions() {
    Alert.alert(`${item!.brand} ${item!.modelName}`, undefined, [
      { text: "Edit details", onPress: () => router.push(`/item/${item!.id}/edit`) },
      {
        text: item!.archived ? "Restore from archive" : "Archive",
        onPress: async () => {
          await vault.toggleArchive(item!.id);
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
                await vault.deleteItem(item!.id);
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
        <View style={{ height: 232, backgroundColor: ink.placeholder }}>
          {hero ? (
            <Pressable
              style={{ flex: 1 }}
              onPress={() =>
                images.length > 1 && setPhotoIndex((i) => (i + 1) % images.length)
              }
            >
              <Image
                source={{ uri: assetUri(hero) }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </Pressable>
          ) : showWebImage ? (
            // Found on the web, not taken by the user — labelled as such, and
            // it falls back to the placeholder if the remote URL ever dies.
            <Pressable style={{ flex: 1 }} onPress={takeProductPhoto}>
              <Image
                source={{ uri: webImage! }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="contain"
                onError={() => setWebImageFailed(true)}
              />
              <View
                style={{
                  position: "absolute",
                  left: SCREEN_PAD,
                  bottom: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: "rgba(255,255,255,0.92)",
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <Feather name="globe" size={11} color={ink.textSecondary} />
                <Text
                  style={{
                    fontFamily: fonts.semibold,
                    fontSize: 10.5,
                    color: ink.textSecondary,
                  }}
                >
                  Stock image · tap to use your own
                </Text>
              </View>
            </Pressable>
          ) : (
            <Pressable
              onPress={takeProductPhoto}
              style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}
            >
              {findingImage ? (
                <>
                  <ActivityIndicator size="small" color={ink.placeholderText} />
                  <Mono size={10} color={ink.placeholderText}>
                    finding a product image…
                  </Mono>
                </>
              ) : (
                <>
                  <Feather name="camera" size={22} color={ink.placeholderText} />
                  <Text
                    style={{
                      fontFamily: fonts.semibold,
                      fontSize: 12.5,
                      color: ink.placeholderText,
                    }}
                  >
                    Add a photo of your {item.brand}
                  </Text>
                </>
              )}
            </Pressable>
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
                {w.status === "EXPIRED" ? (
                  <Chip label="expired" size="sm" />
                ) : (
                  <Chip label={`${w.daysRemaining} days left`} kind="accent" size="sm" />
                )}
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
                          await vault.removeAsset(item!.id, a.id);
                          load();
                        },
                      },
                    ])
                  }
                  style={{ width: 98, gap: 4 }}
                >
                  {a.mimeType.startsWith("image/") ? (
                    <Image
                      source={{ uri: assetUri(a) }}
                      style={{
                        width: 98,
                        height: 72,
                        borderRadius: 14,
                        backgroundColor: ink.placeholder,
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 98,
                        height: 72,
                        borderRadius: 14,
                        backgroundColor: ink.placeholder,
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                      }}
                    >
                      <Feather name="file-text" size={18} color={ink.placeholderText} />
                    </View>
                  )}
                  <Mono size={9} color={ink.placeholderText} style={{ maxWidth: 98 }}>
                    {a.mimeType === "application/pdf"
                      ? `${a.type.toLowerCase().replace("_", "-")}.pdf`
                      : `${a.type.toLowerCase().replace("_", "-")}.jpg`}
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
