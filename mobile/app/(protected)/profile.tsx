import React, { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Linking from "expo-linking";
import * as MailComposer from "expo-mail-composer";
import * as Sharing from "expo-sharing";
import * as StoreReview from "expo-store-review";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { createBackup, createCsv, restoreBackup } from "@/lib/backup";
import { eraseVault } from "@/lib/app-reset";
import { vault, type VaultItemView, type VaultSettings } from "@/lib/vault";
import { formatMoney, userInitial } from "@/lib/format";
import {
  fonts,
  ink,
  SCREEN_PAD,
  THEME_LABELS,
  THEME_SWATCHES,
  type ThemeName,
} from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import { useTour } from "@/lib/tour-context";
import { Header } from "@/components/Header";
import {
  Avatar,
  Chip,
  CircleBtn,
  ListGroup,
  Mono,
  SectionLabel,
} from "@/components/ui";

export default function ProfileScreen() {
  const router = useRouter();
  const { t, themeName, setTheme } = useTheme();
  const { start: startTour } = useTour();
  const [items, setItems] = useState<VaultItemView[]>([]);
  const [settings, setSettings] = useState<VaultSettings | null>(null);
  const [busy, setBusy] = useState<null | "backup" | "csv" | "restore">(null);

  const load = useCallback(async () => {
    try {
      const [list, s] = await Promise.all([vault.listItems(), vault.settings()]);
      setItems(list);
      setSettings(s);
    } catch {
      // keep last data
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const active = items.filter(
    (i) =>
      !i.archived &&
      (i.warranty.status === "ACTIVE" || i.warranty.status === "EXPIRING_SOON")
  );
  const protectedValue = active.reduce(
    (sum, i) => sum + (i.purchasePrice ? Number(i.purchasePrice) : 0),
    0
  );
  const claimsWon = items.reduce(
    (n, i) =>
      n +
      i.claims.filter((c) => c.status === "APPROVED" || c.status === "RESOLVED")
        .length,
    0
  );

  const owner = settings?.owner;
  const name = owner?.name || "You";
  const email = owner?.email ?? "";

  async function exportCsv() {
    setBusy("csv");
    try {
      const file = await createCsv();
      await Sharing.shareAsync(file.uri, { mimeType: "text/csv" });
    } catch (e) {
      Alert.alert("Export failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(null);
    }
  }

  /**
   * The vault exists only on this phone, so a backup is the sole protection
   * against a lost or wiped device. One file carries records and photos.
   */
  async function exportBackup() {
    setBusy("backup");
    try {
      const file = await createBackup();
      await Sharing.shareAsync(file.uri, { mimeType: "application/json" });
    } catch (e) {
      Alert.alert("Backup failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(null);
    }
  }

  function importBackup() {
    Alert.alert(
      "Restore from backup?",
      "This replaces everything currently in the vault with the contents of the backup file. It cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Choose file",
          style: "destructive",
          onPress: async () => {
            const picked = await DocumentPicker.getDocumentAsync({
              type: ["application/json", "application/octet-stream"],
              copyToCacheDirectory: true,
            });
            if (picked.canceled || !picked.assets?.[0]) return;
            setBusy("restore");
            try {
              const r = await restoreBackup(picked.assets[0].uri);
              await load();
              Alert.alert(
                "Vault restored",
                `${r.items} item${r.items === 1 ? "" : "s"} and ${r.photos} photo${r.photos === 1 ? "" : "s"} recovered.`
              );
            } catch (e) {
              Alert.alert(
                "Restore failed",
                e instanceof Error ? e.message : "Try again."
              );
            } finally {
              setBusy(null);
            }
          },
        },
      ]
    );
  }

  function confirmErase() {
    Alert.alert(
      "Delete everything?",
      "Every item, photo and claim on this device is removed. There is no cloud copy — export a backup first if you might want any of it back.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete all",
          style: "destructive",
          onPress: async () => {
            await eraseVault();
            await load();
            Alert.alert("Vault cleared", "The vault is now empty.");
          },
        },
      ]
    );
  }

  const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";
  const ANDROID_PACKAGE =
    Constants.expoConfig?.android?.package ?? "com.ashley.warrantyvault";
  const SUPPORT_EMAIL = "ashley_d_87@hotmail.com";

  /** Pre-filled support email with the diagnostics that make a report useful. */
  async function sendFeedback() {
    const body = [
      "",
      "",
      "— — —",
      "Sent from Serial Vault. The details below help us debug:",
      `App version: ${APP_VERSION}`,
      `Platform: ${Platform.OS} ${Platform.Version}`,
      `Items in vault: ${items.filter((i) => !i.archived).length}`,
    ].join("\n");
    try {
      if (await MailComposer.isAvailableAsync()) {
        await MailComposer.composeAsync({
          recipients: [SUPPORT_EMAIL],
          subject: `Serial Vault feedback (v${APP_VERSION})`,
          body,
        });
        return;
      }
    } catch {
      // fall through to the mailto: handoff
    }
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      `Serial Vault feedback (v${APP_VERSION})`
    )}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("No mail app", `Email us at ${SUPPORT_EMAIL}`)
    );
  }

  /** In-app review sheet where the OS allows it, store listing otherwise. */
  async function rateApp() {
    try {
      if (
        (await StoreReview.hasAction()) &&
        (await StoreReview.isAvailableAsync())
      ) {
        await StoreReview.requestReview();
        return;
      }
    } catch {
      // fall through to the store listing
    }
    const storeUrl =
      Platform.OS === "android"
        ? `market://details?id=${ANDROID_PACKAGE}`
        : StoreReview.storeUrl() ?? "";
    if (!storeUrl) {
      Alert.alert(
        "Not published yet",
        "Rating opens once the app is live on the store. Use “Send feedback” to tell us what you think."
      );
      return;
    }
    Linking.openURL(storeUrl).catch(() =>
      Alert.alert(
        "Couldn't open the store",
        "Search for Serial Vault in the Play Store to leave a rating."
      )
    );
  }

  function themeCircle(name: ThemeName) {
    const isSelected = themeName === name;
    const isMono = name === "mono";
    return (
      <Pressable
        key={name}
        onPress={() => setTheme(name)}
        hitSlop={6}
        style={({ pressed }) => ({
          transform: [{ scale: pressed ? 0.96 : 1 }],
        })}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: isMono ? ink.controlBorder : "rgba(11,11,11,0.12)",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isMono
              ? undefined
              : THEME_SWATCHES[name as Exclude<ThemeName, "mono">],
          }}
        >
          {isMono && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                flexDirection: "row",
              }}
            >
              <View style={{ flex: 1, backgroundColor: "#0B0B0B" }} />
              <View style={{ flex: 1, backgroundColor: "#FFFFFF" }} />
            </View>
          )}
          {isSelected && (
            <Feather
              name="check"
              size={15}
              color={isMono ? "#FFFFFF" : ink.ink}
              style={
                isMono
                  ? {
                      textShadowColor: "rgba(0,0,0,0.9)",
                      textShadowRadius: 3,
                    }
                  : undefined
              }
            />
          )}
        </View>
        {/* Selected ring: white gap + ink ring */}
        {isSelected && (
          <View
            style={{
              position: "absolute",
              top: -5,
              left: -5,
              right: -5,
              bottom: -5,
              borderRadius: 22,
              borderWidth: 2,
              borderColor: ink.ink,
            }}
          />
        )}
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ink.paper }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PAD,
          paddingTop: 10,
          paddingBottom: 40,
          gap: 22,
        }}
      >
        <Header
          title="Profile"
          back
          right={
            <CircleBtn
              icon={<Feather name="sliders" size={18} color={ink.ink} />}
              onPress={() => router.push("/alerts")}
            />
          }
        />

        {/* Identity */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Avatar letter={userInitial(owner)} size={64} />
          <View style={{ gap: 3 }}>
            <Text
              style={{
                fontFamily: fonts.extrabold,
                fontSize: 20,
                letterSpacing: -0.3,
                color: ink.ink,
              }}
            >
              {name}
            </Text>
            <Text
              style={{ fontFamily: fonts.regular, fontSize: 13, color: ink.textSecondary }}
            >
              {email}
            </Text>
          </View>
        </View>

        {/* Stat chips */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Chip label={`${items.filter((i) => !i.archived).length} items`} />
          <Chip
            label={`${formatMoney(protectedValue, settings?.currency ?? "USD")} protected`}
          />
          <Chip label={`${claimsWon} claim${claimsWon === 1 ? "" : "s"} won`} kind="accent" />
        </View>

        {/* Appearance */}
        <View style={{ gap: 12 }}>
          <SectionLabel>Appearance</SectionLabel>
          <View
            style={{
              backgroundColor: ink.card,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: ink.cardBorder,
              padding: 18,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ gap: 3 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: ink.ink }}>
                App color
              </Text>
              <Text
                style={{ fontFamily: fonts.regular, fontSize: 12.5, color: ink.textSecondary }}
              >
                {THEME_LABELS[themeName]} selected
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 14, paddingRight: 4 }}>
              {(["lime", "periwinkle", "mono"] as ThemeName[]).map(themeCircle)}
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={{ gap: 12 }}>
          <SectionLabel>Settings</SectionLabel>
          <ListGroup>
            <SettingsRow
              icon={<Feather name="bell" size={19} color={ink.ink} />}
              title="Expiry alerts"
              sub={`${settings?.reminderLeadDays ?? 30} days before`}
              onPress={() => router.push("/alerts")}
            />
            <SettingsRow
              icon={<Feather name="user" size={19} color={ink.ink} />}
              title="Your details"
              sub={
                owner?.name
                  ? [owner.name, owner.email].filter(Boolean).join(" · ")
                  : "Needed on every warranty claim"
              }
              onPress={() => router.push("/owner")}
            />
          </ListGroup>
        </View>

        {/* Backup — the vault is on this device only */}
        <View style={{ gap: 12 }}>
          <SectionLabel>Backup</SectionLabel>
          <ListGroup>
            <SettingsRow
              icon={<Feather name="save" size={19} color={ink.ink} />}
              title="Export a backup"
              sub={
                busy === "backup"
                  ? "Packing records and photos…"
                  : "One file with every record and photo"
              }
              onPress={exportBackup}
            />
            <SettingsRow
              icon={<Feather name="upload" size={19} color={ink.ink} />}
              title="Restore from backup"
              sub={busy === "restore" ? "Restoring…" : "Replaces the current vault"}
              onPress={importBackup}
            />
            <SettingsRow
              icon={<Feather name="grid" size={19} color={ink.ink} />}
              title="Export as spreadsheet"
              sub={busy === "csv" ? "Preparing…" : "CSV for insurance or records"}
              onPress={exportCsv}
            />
            <SettingsRow
              icon={<Feather name="trash-2" size={19} color={ink.ink} />}
              title="Delete all data"
              sub="Erases this device's vault permanently"
              chevron={false}
              onPress={confirmErase}
            />
          </ListGroup>
          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: 12,
              lineHeight: 18,
              color: ink.textSecondary,
              paddingHorizontal: 4,
            }}
          >
            Your vault is stored only on this phone — there is no account and
            nothing is uploaded. Export a backup regularly so a lost or wiped
            device doesn&apos;t take your records with it.
          </Text>
        </View>

        {/* Help & feedback */}
        <View style={{ gap: 12 }}>
          <SectionLabel>Help & feedback</SectionLabel>
          <ListGroup>
            <SettingsRow
              icon={<Feather name="compass" size={19} color={ink.ink} />}
              title="Take the tour"
              sub="Replay the guided walkthrough"
              onPress={() => {
                // The tour spotlights Home, so go there before it starts.
                router.dismissTo("/(tabs)");
                setTimeout(startTour, 350);
              }}
            />
            <SettingsRow
              icon={<Feather name="message-square" size={19} color={ink.ink} />}
              title="Send feedback"
              sub="Report a bug or request a feature"
              onPress={sendFeedback}
            />
            <SettingsRow
              icon={<Feather name="star" size={19} color={ink.ink} />}
              title="Rate this app"
              sub="Tell others what you think"
              onPress={rateApp}
            />
          </ListGroup>
        </View>

        {/* Footer */}
        <View style={{ alignItems: "center", marginTop: 16 }}>
          <Mono size={10} color={ink.textMuted} style={{ letterSpacing: 1 }}>
            SERIAL VAULT v1.0 · SN 8H24-99401-B
          </Mono>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({
  icon,
  title,
  sub,
  onPress,
  disabled = false,
  chevron = true,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  onPress?: () => void;
  disabled?: boolean;
  chevron?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 15,
        borderRadius: 16,
        gap: 14,
        backgroundColor: pressed ? ink.pressHighlight : "transparent",
        opacity: disabled ? 0.45 : 1,
      })}
    >
      {icon}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: ink.ink }}>
          {title}
        </Text>
        {sub ? (
          <Text
            style={{ fontFamily: fonts.regular, fontSize: 12.5, color: ink.textSecondary }}
          >
            {sub}
          </Text>
        ) : null}
      </View>
      {chevron && onPress && !disabled && (
        <Feather name="chevron-right" size={18} color={ink.textSecondary} />
      )}
    </Pressable>
  );
}
