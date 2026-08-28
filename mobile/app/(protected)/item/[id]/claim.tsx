import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
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
import * as Clipboard from "expo-clipboard";
import * as MailComposer from "expo-mail-composer";
import * as Sharing from "expo-sharing";
import { api, type ClaimContactInfo } from "@/lib/api";
import {
  vault,
  type OwnerDetails,
  type VaultClaim,
  type VaultItemView,
} from "@/lib/vault";
import {
  buildClaimPdf,
  claimAsText,
  claimReference,
  REMEDY_LABELS,
} from "@/lib/claim-pdf";
import { CLAIM_STATUSES, CLAIM_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";
import { fonts, ink, SCREEN_PAD } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import { Header } from "@/components/Header";
import {
  Chip,
  ChipRow,
  CircleBtn,
  Field,
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

const REMEDIES = ["REPAIR", "REPLACE", "REFUND"] as const;
const OPEN = ["DRAFT", "SUBMITTED", "IN_REVIEW"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ClaimBuilderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTheme();
  const [item, setItem] = useState<VaultItemView | null>(null);
  const [owner, setOwner] = useState<OwnerDetails | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [issue, setIssue] = useState("");
  const [remedy, setRemedy] = useState<string | null>("REPAIR");
  const [sendTo, setSendTo] = useState("");
  const [busy, setBusy] = useState<null | "pdf" | "email" | "copy">(null);
  const [loaded, setLoaded] = useState(false);
  const [contacts, setContacts] = useState<{
    manufacturer: ClaimContactInfo | null;
    retailer: ClaimContactInfo | null;
  } | null>(null);
  const [contactsLoading, setContactsLoading] = useState(false);

  const fetchContacts = useCallback(async (it: VaultItemView) => {
    setContactsLoading(true);
    try {
      const params = new URLSearchParams();
      if (it.brand) params.set("brand", it.brand);
      if (it.storeName) params.set("store", it.storeName);
      const d = await api<{
        manufacturer: ClaimContactInfo | null;
        retailer: ClaimContactInfo | null;
      }>(`/api/claim-contacts?${params.toString()}`);
      setContacts(d);
      setSendTo(
        (prev) => prev || d.manufacturer?.email || d.retailer?.email || ""
      );
    } catch {
      setContacts({ manufacturer: null, retailer: null });
    } finally {
      setContactsLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    const found = await vault.getItem(id);
    if (!found) {
      router.back();
      return;
    }
    setItem(found);
    const settings = await vault.settings();
    setOwner(settings.owner);
    if (!loaded) {
      setSelected(new Set(found.assets.map((a) => a.id)));
      const open = found.claims.find((c) => OPEN.includes(c.status));
      if (open) {
        setIssue(open.issueDescription);
        if (open.providerContact) setSendTo(open.providerContact);
        if (open.requestedRemedy) setRemedy(open.requestedRemedy);
      }
      setLoaded(true);
      fetchContacts(found);
    }
  }, [id, router, loaded, fetchContacts]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!item || !owner) return <LoadingScreen />;

  const w = item.warranty;
  const inWarranty = w.status === "ACTIVE" || w.status === "EXPIRING_SOON";
  const openClaim: VaultClaim | undefined = item.claims.find((c) =>
    OPEN.includes(c.status)
  );
  const latestClaim = openClaim ?? item.claims[0];
  const ready = selected.size > 0 && issue.trim().length > 0;
  const ownerMissing = !owner.name.trim();

  function toggle(assetId: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  }

  async function persistClaim() {
    await vault.saveClaim(item!.id, {
      id: openClaim?.id,
      issueDescription: issue.trim(),
      providerContact: sendTo.trim() || null,
      requestedRemedy: remedy,
      status: openClaim?.status ?? "DRAFT",
    });
  }

  function claimInput() {
    return {
      item: item!,
      owner: owner!,
      issue,
      remedy,
      includedAssetIds: [...selected],
      sendTo,
    };
  }

  /** Nudge once — a claim without a claimant is the thing manufacturers reject. */
  function warnIfOwnerMissing(): boolean {
    if (!ownerMissing) return false;
    Alert.alert(
      "Add your details first",
      "Manufacturers need a name and contact to process a claim. Add them once in Profile and every claim uses them.",
      [
        { text: "Continue anyway", style: "destructive", onPress: () => {} },
        { text: "Add details", onPress: () => router.push("/profile") },
      ]
    );
    return true;
  }

  async function exportPdf() {
    if (!ready) return;
    setBusy("pdf");
    try {
      await persistClaim();
      const file = await buildClaimPdf(claimInput());
      await Sharing.shareAsync(file.uri, { mimeType: "application/pdf" });
      load();
    } catch (e) {
      Alert.alert("Export failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function emailClaim() {
    if (!ready) return;
    const to = sendTo.trim();
    if (to && !EMAIL_RE.test(to)) {
      Alert.alert("Check the claim email", `"${to}" doesn't look like an email address.`);
      return;
    }
    setBusy("email");
    try {
      await persistClaim();
      const file = await buildClaimPdf(claimInput());
      if (!(await MailComposer.isAvailableAsync())) {
        await Sharing.shareAsync(file.uri, { mimeType: "application/pdf" });
        return;
      }
      const it = item!;
      await MailComposer.composeAsync({
        recipients: to ? [to] : undefined,
        subject: `Warranty claim ${claimReference(it)} — ${it.brand} ${it.modelName}${
          it.serialNumber ? ` (S/N ${it.serialNumber})` : ""
        }`,
        body: [
          "Hello,",
          "",
          `I'd like to make a warranty claim for my ${it.brand} ${it.modelName}.`,
          it.serialNumber ? `Serial number: ${it.serialNumber}` : null,
          it.purchaseDate
            ? `Purchased ${formatDate(it.purchaseDate)}${it.storeName ? ` from ${it.storeName}` : ""}.`
            : null,
          "",
          `Fault: ${issue.trim()}`,
          remedy ? `Remedy requested: ${REMEDY_LABELS[remedy] ?? remedy}` : null,
          "",
          "The attached PDF contains my contact details, proof of purchase and photographs of the fault and serial number.",
          "",
          owner!.name ? `Kind regards,\n${owner!.name}` : "Kind regards,",
        ]
          .filter((l) => l !== null)
          .join("\n"),
        attachments: [file.uri],
      });
      load();
    } catch (e) {
      Alert.alert("Email failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(null);
    }
  }

  /** For the many manufacturers who run a web form instead of taking email. */
  async function copyForPortal() {
    if (!ready) return;
    setBusy("copy");
    try {
      await persistClaim();
      await Clipboard.setStringAsync(claimAsText(claimInput()));
      Alert.alert(
        "Claim details copied",
        "Paste them into the manufacturer's claim form. The PDF with your evidence can be attached from Export."
      );
      load();
    } finally {
      setBusy(null);
    }
  }

  async function setClaimStatus(status: string) {
    if (!latestClaim) return;
    await vault.saveClaim(item!.id, {
      id: latestClaim.id,
      issueDescription: latestClaim.issueDescription,
      status,
    });
    load();
  }

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
            paddingBottom: 150,
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
                label={
                  inWarranty
                    ? "In warranty"
                    : w.status === "EXPIRED"
                      ? "Expired"
                      : "No warranty"
                }
                kind={inWarranty ? "accent" : "outline"}
                onInk
              />
            </View>
            <View style={{ height: 1, backgroundColor: ink.onInkDivider }} />
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
                  style={{ fontFamily: fonts.bold, fontSize: 13, color: t.accentOnInk }}
                >
                  {w.daysRemaining} days left
                </Text>
              )}
            </View>
          </View>

          {/* Claimant — the detail manufacturers reject claims for missing */}
          <Pressable
            onPress={() => router.push("/profile")}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              backgroundColor: pressed ? ink.pressHighlight : ink.card,
              borderRadius: 18,
              padding: 16,
            })}
          >
            <Feather
              name={ownerMissing ? "alert-circle" : "user"}
              size={19}
              color={ink.ink}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 14.5, color: ink.ink }}>
                {ownerMissing ? "Add your details" : owner.name}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.regular,
                  fontSize: 12.5,
                  color: ink.textSecondary,
                }}
                numberOfLines={1}
              >
                {ownerMissing
                  ? "Name and contact go on every claim — add them once"
                  : [owner.email, owner.phone].filter(Boolean).join(" · ") ||
                    "Tap to add contact details"}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={ink.textSecondary} />
          </Pressable>

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
                          backgroundColor: on ? ink.ink : "transparent",
                          borderWidth: on ? 0 : 1.5,
                          borderColor: ink.chipBorder,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {on && (
                          <Feather name="check" size={14} color={t.indicatorOnInk} />
                        )}
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
              selectionColor={ink.ink}
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

          {/* Remedy */}
          <View style={{ gap: 12 }}>
            <SectionLabel>What are you asking for?</SectionLabel>
            <ChipRow
              options={REMEDIES}
              value={(remedy ?? "REPAIR") as (typeof REMEDIES)[number]}
              onChange={(v) => setRemedy(v)}
              labels={REMEDY_LABELS}
            />
          </View>

          {/* Send to */}
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <SectionLabel>Send to</SectionLabel>
              <View style={{ flex: 1 }} />
              {contactsLoading && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                  <ActivityIndicator size="small" color={ink.textSecondary} />
                  <Text
                    style={{
                      fontFamily: fonts.regular,
                      fontSize: 12.5,
                      color: ink.textSecondary,
                    }}
                  >
                    Finding claim contacts…
                  </Text>
                </View>
              )}
            </View>

            {contacts && (contacts.manufacturer || contacts.retailer) ? (
              <ListGroup>
                {[contacts.manufacturer, contacts.retailer]
                  .filter((c): c is ClaimContactInfo => c !== null)
                  .map((c) => {
                    const chosen = Boolean(c.email) && sendTo.trim() === c.email;
                    return (
                      <Pressable
                        key={c.kind}
                        onPress={() => {
                          if (c.email) setSendTo(c.email);
                          else if (c.url) Linking.openURL(c.url).catch(() => {});
                        }}
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
                          <Feather
                            name={c.kind === "MANUFACTURER" ? "tool" : "shopping-bag"}
                            size={17}
                            color={ink.ink}
                          />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text
                            style={{
                              fontFamily: fonts.bold,
                              fontSize: 14.5,
                              color: ink.ink,
                            }}
                          >
                            {c.displayName}
                            <Text
                              style={{
                                fontFamily: fonts.regular,
                                color: ink.textSecondary,
                              }}
                            >
                              {c.kind === "MANUFACTURER"
                                ? "  · manufacturer"
                                : "  · retailer"}
                            </Text>
                          </Text>
                          <Text
                            style={{
                              fontFamily: fonts.regular,
                              fontSize: 12,
                              color: ink.textSecondary,
                            }}
                            numberOfLines={1}
                          >
                            {c.email ??
                              (c.url
                                ? `Claims portal — tap to open${c.phone ? ` · ${c.phone}` : ""}`
                                : (c.phone ?? "No public contact found"))}
                          </Text>
                        </View>
                        {c.email ? (
                          <View
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 13,
                              backgroundColor: chosen ? ink.ink : "transparent",
                              borderWidth: chosen ? 0 : 1.5,
                              borderColor: ink.chipBorder,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {chosen && (
                              <Feather name="check" size={14} color={t.indicatorOnInk} />
                            )}
                          </View>
                        ) : c.url ? (
                          <Feather
                            name="external-link"
                            size={16}
                            color={ink.textSecondary}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
              </ListGroup>
            ) : null}

            <Field
              label="Claim email"
              value={sendTo}
              onChangeText={setSendTo}
              placeholder="claims@manufacturer.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {/* Portal path: many manufacturers take web forms, not email */}
            <Pressable
              onPress={() => {
                if (warnIfOwnerMissing()) return;
                copyForPortal();
              }}
              disabled={!ready || busy !== null}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                height: 50,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: ink.controlBorder,
                opacity: !ready || busy !== null ? 0.45 : pressed ? 0.7 : 1,
              })}
            >
              {busy === "copy" ? (
                <ActivityIndicator size="small" color={ink.ink} />
              ) : (
                <Feather name="clipboard" size={17} color={ink.ink} />
              )}
              <Text style={{ fontFamily: fonts.bold, fontSize: 14.5, color: ink.ink }}>
                Copy details for a web form
              </Text>
            </Pressable>
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
            icon={
              busy === "email" ? (
                <ActivityIndicator size="small" color={ink.ink} />
              ) : (
                <Feather name="mail" size={20} color={ink.ink} />
              )
            }
            onPress={() => {
              if (!ready || busy) return;
              if (warnIfOwnerMissing()) return;
              emailClaim();
            }}
          />
          <Pill
            label={busy === "pdf" ? "Building…" : "Export claim PDF"}
            arrow
            loading={busy === "pdf"}
            disabled={!ready || busy !== null}
            style={{ flex: 1 }}
            onPress={() => {
              if (warnIfOwnerMissing()) return;
              exportPdf();
            }}
          />
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}
