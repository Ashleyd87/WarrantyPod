import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { api, filePart, type ApiItem, type ExtractionResult } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { fonts, ink, SCREEN_PAD } from "@/lib/theme";
import { Header } from "@/components/Header";
import { ListGroup, Pill, SectionLabel } from "@/components/ui";

interface EmailRow {
  key: string;
  fileName: string;
  mimeType: string;
  uri: string;
  status: "reading" | "done" | "failed";
  extraction: ExtractionResult | null;
  selected: boolean;
}

const PICKER_TYPES = [
  "application/pdf",
  "message/rfc822",
  "text/plain",
  "application/octet-stream",
  "image/*",
];

function isImage(mime: string) {
  return mime.startsWith("image/");
}

function matched(r: EmailRow) {
  return Boolean(r.extraction && (r.extraction.brand || r.extraction.modelName));
}

export default function EmailImportScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [importing, setImporting] = useState(false);
  const pickedOnce = useRef(false);

  async function pickFiles() {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
      type: PICKER_TYPES,
    });
    if (result.canceled || !result.assets?.length) {
      if (rows.length === 0) router.back();
      return;
    }
    const fresh: EmailRow[] = result.assets.map((a, i) => ({
      key: `${Date.now()}-${i}-${a.name}`,
      fileName: a.name,
      mimeType: a.mimeType ?? "application/octet-stream",
      uri: a.uri,
      status: "reading",
      extraction: null,
      selected: false,
    }));
    setRows((r) => [...r, ...fresh]);
    fresh.forEach(extractRow);
  }

  async function extractRow(row: EmailRow) {
    try {
      const fd = new FormData();
      const field = isImage(row.mimeType) ? "images" : "documents";
      fd.append(field, filePart(row.uri, row.fileName, row.mimeType));
      const { result } = await api<{ result: ExtractionResult }>(
        "/api/extract",
        { method: "POST", body: fd }
      );
      setRows((rs) =>
        rs.map((r) =>
          r.key === row.key
            ? {
                ...r,
                status: "done",
                extraction: result,
                // Rows with no detected product start unselected.
                selected: Boolean(result.brand || result.modelName),
              }
            : r
        )
      );
    } catch {
      setRows((rs) =>
        rs.map((r) => (r.key === row.key ? { ...r, status: "failed" } : r))
      );
    }
  }

  useEffect(() => {
    if (!pickedOnce.current) {
      pickedOnce.current = true;
      pickFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(key: string) {
    setRows((rs) =>
      rs.map((r) =>
        r.key === key && r.status === "done" ? { ...r, selected: !r.selected } : r
      )
    );
  }

  const selectedRows = rows.filter((r) => r.selected);

  async function importSelected() {
    setImporting(true);
    let created = 0;
    try {
      for (const row of selectedRows) {
        const x = row.extraction;
        const base = row.fileName.replace(/\.[a-z0-9]+$/i, "");
        const fd = new FormData();
        fd.append("brand", x?.brand ?? x?.storeName ?? "Unknown");
        fd.append("modelName", x?.modelName ?? base);
        fd.append("category", x?.suggestedCategory ?? "OTHER");
        fd.append("serialNumber", x?.serialNumber ?? "");
        fd.append("purchaseDate", x?.purchaseDate ?? "");
        fd.append(
          "purchasePrice",
          x?.purchasePrice != null ? String(x.purchasePrice) : ""
        );
        fd.append("currency", x?.currency ?? "USD");
        fd.append("storeName", x?.storeName ?? "");
        fd.append("warrantyType", "MANUFACTURER");
        fd.append(
          "warrantyDurationMonths",
          x?.estimatedWarrantyMonths != null
            ? String(x.estimatedWarrantyMonths)
            : ""
        );
        fd.append("warrantyAssumed", x?.warrantyAssumed === false ? "" : "true");
        fd.append("notes", "");
        // Attach the source file as the receipt (images + PDFs; .eml is text-only).
        if (isImage(row.mimeType) || row.mimeType === "application/pdf") {
          fd.append("assetFile", filePart(row.uri, row.fileName, row.mimeType));
          fd.append("assetType", "RECEIPT");
        }
        await api<{ item: ApiItem }>("/api/items", { method: "POST", body: fd });
        created += 1;
      }
      router.replace("/(tabs)/items");
    } catch (e) {
      Alert.alert(
        created > 0 ? `Imported ${created}, then failed` : "Import failed",
        e instanceof Error ? e.message : "Try again."
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ink.paper }} edges={["top"]}>
      <View style={{ flex: 1, paddingHorizontal: SCREEN_PAD, paddingTop: 10 }}>
        <Header title="Import email" back />

        <View
          style={{
            marginTop: 20,
            flexDirection: "row",
            alignItems: "baseline",
          }}
        >
          <SectionLabel>Files you selected</SectionLabel>
          <View style={{ flex: 1 }} />
          <Text
            style={{
              fontFamily: fonts.semibold,
              fontSize: 13,
              color: ink.textSecondary,
            }}
          >
            Files · {rows.length}
          </Text>
        </View>

        <ScrollView
          style={{ marginTop: 12 }}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {rows.length === 0 ? (
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: 13.5,
                lineHeight: 20,
                color: ink.textSecondary,
              }}
            >
              Pick order confirmations to import — PDF or .eml files, or
              screenshots of the email.
            </Text>
          ) : (
            <ListGroup>
              {rows.map((row) => {
                const ok = matched(row);
                const x = row.extraction;
                const title =
                  row.status === "done" && x?.storeName
                    ? x.storeName
                    : row.fileName;
                const meta =
                  row.status === "reading"
                    ? "Reading…"
                    : row.status === "failed"
                      ? "Couldn't read this file"
                      : ok
                        ? [
                            [x?.brand, x?.modelName].filter(Boolean).join(" "),
                            x?.purchasePrice != null
                              ? formatMoney(x.purchasePrice, x.currency ?? "USD")
                              : null,
                            x?.purchaseDate ? formatDate(x.purchaseDate) : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        : "No product detected";
                const letter = title.charAt(0).toUpperCase();
                return (
                  <Pressable
                    key={row.key}
                    onPress={() => toggle(row.key)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 12,
                      paddingVertical: 14,
                      borderRadius: 16,
                      backgroundColor: pressed ? ink.pressHighlight : "transparent",
                      gap: 12,
                    })}
                  >
                    {/* Initial avatar: ink when matched, outlined when not */}
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 21,
                        backgroundColor: ok ? ink.ink : ink.paper,
                        borderWidth: ok ? 0 : 1.5,
                        borderColor: ink.controlBorder,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {row.status === "reading" ? (
                        <ActivityIndicator
                          size="small"
                          color={ok ? "#FFFFFF" : ink.ink}
                        />
                      ) : (
                        <Text
                          style={{
                            fontFamily: fonts.extrabold,
                            fontSize: 15,
                            color: ok ? "#FFFFFF" : ink.ink,
                          }}
                        >
                          {letter}
                        </Text>
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={{ fontFamily: fonts.bold, fontSize: 15, color: ink.ink }}
                        numberOfLines={1}
                      >
                        {title}
                      </Text>
                      <Text
                        style={{
                          fontFamily: fonts.regular,
                          fontSize: 12.5,
                          color: ink.textSecondary,
                        }}
                        numberOfLines={1}
                      >
                        {meta}
                      </Text>
                    </View>
                    {/* Selection control */}
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        backgroundColor: row.selected ? ink.ink : "transparent",
                        borderWidth: row.selected ? 0 : 1.5,
                        borderColor: ink.chipBorder,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {row.selected && (
                        <Feather name="check" size={14} color="#FFFFFF" />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ListGroup>
          )}

          <Pressable onPress={pickFiles} hitSlop={8} style={{ marginTop: 16 }}>
            <Text
              style={{
                fontFamily: fonts.bold,
                fontSize: 13.5,
                color: ink.ink,
                textAlign: "center",
                textDecorationLine: "underline",
              }}
            >
              Choose more files
            </Text>
          </Pressable>

          <View
            style={{
              marginTop: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <Ionicons name="sparkles" size={15} color={ink.ink} />
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: 12.5,
                color: ink.textSecondary,
              }}
            >
              AI extracts product, price, purchase date & warranty terms
            </Text>
          </View>
        </ScrollView>

        <View style={{ paddingBottom: 26 }}>
          <Pill
            label={
              importing
                ? "Importing…"
                : `Import ${selectedRows.length} email${selectedRows.length === 1 ? "" : "s"}`
            }
            variant="ink"
            loading={importing}
            disabled={selectedRows.length === 0}
            onPress={importSelected}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
