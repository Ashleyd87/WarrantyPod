import React, { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  api,
  apiRaw,
  authHeaders,
  fileUrl,
  filePart,
  type ApiClaim,
  type ApiItem,
} from "@/lib/api";
import {
  ASSET_TYPE_LABELS,
  CATEGORY_LABELS,
  CLAIM_STATUSES,
  CLAIM_STATUS_LABELS,
  WARRANTY_TYPE_LABELS,
} from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";
import { colors, radius, spacing } from "@/lib/theme";
import { warrantyBadge } from "@/components/ItemCard";
import { Badge, Button, Card, ChipRow, Field, LoadingScreen, SectionTitle } from "@/components/ui";
import * as ImagePicker from "expo-image-picker";

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<ApiItem | null>(null);
  const [claimModal, setClaimModal] = useState<{ claim?: ApiClaim } | null>(null);
  const [busy, setBusy] = useState(false);

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

  const badge = warrantyBadge(item);
  const facts: [string, string][] = [
    ["Category", CATEGORY_LABELS[item.category] ?? item.category],
    ["Serial number", item.serialNumber ?? "—"],
    ["Purchase date", formatDate(item.purchaseDate)],
    ["Price", formatMoney(item.purchasePrice, item.currency)],
    ["Store", item.storeName ?? "—"],
    [
      "Warranty",
      `${WARRANTY_TYPE_LABELS[item.warrantyType] ?? item.warrantyType}${item.warrantyProvider ? ` · ${item.warrantyProvider}` : ""}`,
    ],
    [
      "Duration",
      item.warrantyDurationMonths
        ? `${item.warrantyDurationMonths} months${item.warrantyAssumed ? " (assumed)" : ""}`
        : "—",
    ],
    ["Expires", formatDate(item.warrantyExpirationDate)],
  ];

  async function sharePdf() {
    setBusy(true);
    try {
      const res = await apiRaw(`/api/items/${item!.id}/claim-package`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const dir = new Directory(Paths.cache, "exports");
      if (!dir.exists) dir.create();
      const file = new File(dir, `claim-package.pdf`);
      if (file.exists) file.delete();
      file.create();
      file.write(bytes);
      await Sharing.shareAsync(file.uri, { mimeType: "application/pdf" });
    } catch (e) {
      Alert.alert("Export failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function addPhoto() {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      quality: 0.5,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const fd = new FormData();
    fd.append("assetFile", filePart(result.assets[0].uri, "photo.jpg"));
    fd.append("assetType", "PRODUCT_PHOTO");
    try {
      await api(`/api/items/${item!.id}/assets`, { method: "POST", body: fd });
      load();
    } catch (e) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Try again.");
    }
  }

  function confirmDelete() {
    Alert.alert(
      `Delete ${item!.brand} ${item!.modelName}?`,
      "This permanently removes the product, its photos and claim history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await api(`/api/items/${item!.id}`, { method: "DELETE" });
            router.back();
          },
        },
      ]
    );
  }

  const w = item.warranty;

  return (
    <ScrollView contentContainerStyle={{ padding: spacing(4), gap: spacing(4) }}>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <Text style={styles.h1}>
            <Text style={{ fontWeight: "800" }}>{item.brand}</Text> {item.modelName}
          </Text>
          <Badge text={badge.text} tone={badge.tone} />
        </View>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Added {formatDate(item.createdAt)}
          {item.archived ? " · Archived" : ""}
        </Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Button title="📄 Claim PDF" variant="secondary" loading={busy} onPress={sharePdf} style={{ flexGrow: 1 }} />
        <Button
          title="Edit"
          variant="outline"
          onPress={() => router.push(`/item/${item.id}/edit`)}
          style={{ flexGrow: 1 }}
        />
        <Button
          title={item.archived ? "Restore" : "Archive"}
          variant="outline"
          onPress={async () => {
            await api(`/api/items/${item.id}/archive`, { method: "POST" });
            load();
          }}
          style={{ flexGrow: 1 }}
        />
        <Button title="Delete" variant="outline" onPress={confirmDelete} style={{ flexGrow: 1 }} />
      </View>

      {w.status !== "NO_WARRANTY" && w.fractionElapsed !== null && (
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontWeight: "700", color: colors.foreground }}>
              Warranty countdown
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              {w.status === "EXPIRED"
                ? `Expired ${formatDate(item.warrantyExpirationDate)}`
                : `${w.daysRemaining} days remaining`}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.max(3, w.fractionElapsed * 100)}%`,
                  backgroundColor:
                    w.status === "EXPIRED"
                      ? colors.destructive
                      : w.status === "EXPIRING_SOON"
                        ? colors.warning
                        : colors.primary,
                },
              ]}
            />
          </View>
        </Card>
      )}

      <Card>
        <SectionTitle>Details</SectionTitle>
        <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 12 }}>
          {facts.map(([label, value]) => (
            <View key={label} style={{ width: "50%", paddingRight: 8 }}>
              <Text style={styles.factLabel}>{label.toUpperCase()}</Text>
              <Text style={styles.factValue}>{value}</Text>
            </View>
          ))}
        </View>
        {item.notes ? (
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }}>
            <Text style={styles.factLabel}>NOTES</Text>
            <Text style={styles.factValue}>{item.notes}</Text>
          </View>
        ) : null}
      </Card>

      <Card>
        <SectionTitle>Photos & documents</SectionTitle>
        {item.assets.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {item.assets.map((a) => (
              <View key={a.id} style={styles.assetTile}>
                <Image
                  source={{ uri: fileUrl(a.id), headers: authHeaders() }}
                  style={{ width: "100%", height: 90 }}
                  resizeMode="cover"
                />
                <View style={styles.assetCaption}>
                  <Text style={{ fontSize: 11, fontWeight: "600", flex: 1 }} numberOfLines={1}>
                    {ASSET_TYPE_LABELS[a.type] ?? a.type}
                  </Text>
                  <Pressable
                    onPress={() =>
                      Alert.alert("Remove photo?", undefined, [
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
                  >
                    <Text style={{ color: colors.destructive, fontSize: 12 }}>✕</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
        <Button title="＋ Add photo" variant="outline" onPress={addPhoto} />
      </Card>

      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <SectionTitle>Claims</SectionTitle>
          <Button title="Start a claim" onPress={() => setClaimModal({})} />
        </View>
        {item.claims.length === 0 && (
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            No claims yet. If this product develops a fault under warranty,
            start a claim and share the PDF claim package.
          </Text>
        )}
        {item.claims.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => setClaimModal({ claim: c })}
            style={styles.claimRow}
          >
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <Badge
                text={CLAIM_STATUS_LABELS[c.status] ?? c.status}
                tone={
                  c.status === "APPROVED" || c.status === "RESOLVED"
                    ? "success"
                    : c.status === "DENIED"
                      ? "destructive"
                      : "muted"
                }
              />
              {c.claimNumber ? (
                <Text style={{ color: colors.muted, fontSize: 12 }}>Ref {c.claimNumber}</Text>
              ) : null}
            </View>
            <Text style={{ color: colors.foreground, fontSize: 14 }}>{c.issueDescription}</Text>
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              Opened {formatDate(c.createdAt)}
              {c.resolvedAt ? ` · Closed ${formatDate(c.resolvedAt)}` : ""}
            </Text>
          </Pressable>
        ))}
      </Card>

      {claimModal && (
        <ClaimModal
          itemId={item.id}
          claim={claimModal.claim}
          onClose={(changed) => {
            setClaimModal(null);
            if (changed) load();
          }}
        />
      )}
    </ScrollView>
  );
}

function ClaimModal({
  itemId,
  claim,
  onClose,
}: {
  itemId: string;
  claim?: ApiClaim;
  onClose: (changed: boolean) => void;
}) {
  const [issue, setIssue] = useState(claim?.issueDescription ?? "");
  const [status, setStatus] = useState(claim?.status ?? "DRAFT");
  const [claimNumber, setClaimNumber] = useState(claim?.claimNumber ?? "");
  const [contact, setContact] = useState(claim?.providerContact ?? "");
  const [resolution, setResolution] = useState(claim?.resolutionNotes ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!issue.trim()) {
      Alert.alert("Describe the issue", "What's wrong with the product?");
      return;
    }
    setSaving(true);
    try {
      const body = JSON.stringify({
        issueDescription: issue,
        status,
        claimNumber: claimNumber || null,
        providerContact: contact || null,
        resolutionNotes: resolution || null,
      });
      if (claim) {
        await api(`/api/claims/${claim.id}`, { method: "PATCH", body });
      } else {
        await api(`/api/items/${itemId}/claims`, { method: "POST", body });
      }
      onClose(true);
    } catch (e) {
      Alert.alert("Save failed", e instanceof Error ? e.message : "Try again.");
      setSaving(false);
    }
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={() => onClose(false)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <ScrollView contentContainerStyle={{ gap: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.foreground }}>
              {claim ? "Update claim" : "Start a warranty claim"}
            </Text>
            <Field
              label="What's wrong? *"
              value={issue}
              onChangeText={setIssue}
              multiline
              placeholder="Describe the fault, when it started…"
            />
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>
                Status
              </Text>
              <ChipRow
                options={CLAIM_STATUSES}
                value={status as (typeof CLAIM_STATUSES)[number]}
                onChange={setStatus}
                labels={CLAIM_STATUS_LABELS}
              />
            </View>
            <Field
              label="Claim / ref number"
              value={claimNumber}
              onChangeText={setClaimNumber}
              placeholder="Optional"
            />
            <Field
              label="Provider contact"
              value={contact}
              onChangeText={setContact}
              placeholder="Support email / phone / portal"
            />
            {claim && (
              <Field
                label="Resolution notes"
                value={resolution}
                onChangeText={setResolution}
                multiline
                placeholder="Outcome, replacement, refund…"
              />
            )}
            <Button title={saving ? "Saving…" : "Save claim"} loading={saving} onPress={save} />
            <Button title="Cancel" variant="outline" onPress={() => onClose(false)} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 20, color: colors.foreground, flex: 1 },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#eef1f3",
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 999 },
  factLabel: { fontSize: 10, fontWeight: "700", color: colors.muted, letterSpacing: 0.4 },
  factValue: { fontSize: 14, color: colors.foreground, marginTop: 2 },
  assetTile: {
    width: "31%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  assetCaption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: colors.card,
  },
  claimRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    gap: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing(5),
    maxHeight: "88%",
  },
});
