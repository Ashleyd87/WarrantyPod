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
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { api, apiRaw, type ApiItem, type ApiSettings } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { formatMoney } from "@/lib/format";
import { fonts, ink, SCREEN_PAD, THEME_LABELS, THEMES, type ThemeName } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
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
  const { data: session } = authClient.useSession();
  const [items, setItems] = useState<ApiItem[]>([]);
  const [settings, setSettings] = useState<ApiSettings | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [itemsRes, settingsRes] = await Promise.all([
        api<{ items: ApiItem[] }>("/api/items"),
        api<{ settings: ApiSettings }>("/api/settings"),
      ]);
      setItems(itemsRes.items);
      setSettings(settingsRes.settings);
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

  const name = session?.user.name || "You";
  const email = session?.user.email ?? "";

  async function exportCsv() {
    setExporting(true);
    try {
      const res = await apiRaw("/api/export/csv");
      const csv = await res.text();
      const dir = new Directory(Paths.cache, "exports");
      if (!dir.exists) dir.create();
      const file = new File(dir, "warranty-vault-export.csv");
      if (file.exists) file.delete();
      file.create();
      file.write(csv);
      await Sharing.shareAsync(file.uri, { mimeType: "text/csv" });
    } catch (e) {
      Alert.alert("Export failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setExporting(false);
    }
  }

  function themeCircle(name: ThemeName) {
    const tok = THEMES[name];
    const isSelected = themeName === name;
    const isMono = name === "mono";
    return (
      <Pressable key={name} onPress={() => setTheme(name)} hitSlop={6}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            overflow: "hidden",
            borderWidth: name === "lime" ? 1 : isMono ? 1 : 0,
            borderColor: name === "lime" ? "rgba(11,11,11,0.12)" : ink.controlBorder,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isMono ? undefined : tok.accent,
            ...(isSelected && {
              shadowColor: tok.accent === "#FFFFFF" ? ink.ink : tok.accent,
              shadowOpacity: 0.9,
              shadowRadius: 0,
              shadowOffset: { width: 0, height: 0 },
            }),
          }}
        >
          {isMono && (
            <View style={{ flexDirection: "row", width: "100%", height: "100%" }}>
              <View style={{ flex: 1, backgroundColor: "#0B0B0B" }} />
              <View style={{ flex: 1, backgroundColor: "#FFFFFF" }} />
            </View>
          )}
          {isSelected && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: "rgba(0,0,0,0.35)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="check" size={12} color="#FFFFFF" />
              </View>
            </View>
          )}
        </View>
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
              borderColor: tok.accent === "#FFFFFF" ? ink.ink : tok.accent,
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
          <Avatar letter={name.charAt(0)} size={64} />
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
              {(["violet", "lime", "mono"] as ThemeName[]).map(themeCircle)}
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
              icon={<Feather name="users" size={19} color={ink.ink} />}
              title="Household members"
              sub="Coming soon"
              disabled
            />
            <SettingsRow
              icon={<Feather name="download" size={19} color={ink.ink} />}
              title="Export all data"
              sub={exporting ? "Preparing…" : "Full inventory, CSV"}
              onPress={exportCsv}
            />
            <SettingsRow
              icon={<Feather name="log-out" size={19} color={ink.ink} />}
              title="Sign out"
              onPress={async () => {
                await authClient.signOut();
                router.replace("/welcome");
              }}
            />
          </ListGroup>
        </View>

        {/* Footer */}
        <View style={{ alignItems: "center", marginTop: 16 }}>
          <Mono size={10} color={ink.textMuted} style={{ letterSpacing: 2 }}>
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
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  onPress?: () => void;
  disabled?: boolean;
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
      {onPress && !disabled && (
        <Feather name="chevron-right" size={18} color={ink.textSecondary} />
      )}
    </Pressable>
  );
}
