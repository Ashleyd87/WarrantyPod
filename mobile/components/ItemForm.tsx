import React, { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api, filePart, type ApiItem, type ExtractionResult } from "@/lib/api";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  WARRANTY_TYPES,
  WARRANTY_TYPE_LABELS,
} from "@/lib/constants";
import { addMonthsToDateString, DATE_RE, toDateInputValue } from "@/lib/format";
import { colors, radius } from "@/lib/theme";
import { Button, Card, ChipRow, Field, SectionTitle } from "./ui";

export interface ItemFormValues {
  brand: string;
  modelName: string;
  category: string;
  serialNumber: string;
  purchaseDate: string;
  purchasePrice: string;
  currency: string;
  storeName: string;
  warrantyType: string;
  warrantyProvider: string;
  warrantyDurationMonths: string;
  warrantyExpirationDate: string;
  warrantyAssumed: boolean;
  notes: string;
}

const EMPTY: ItemFormValues = {
  brand: "",
  modelName: "",
  category: "OTHER",
  serialNumber: "",
  purchaseDate: "",
  purchasePrice: "",
  currency: "USD",
  storeName: "",
  warrantyType: "MANUFACTURER",
  warrantyProvider: "",
  warrantyDurationMonths: "",
  warrantyExpirationDate: "",
  warrantyAssumed: false,
  notes: "",
};

interface PhotoSlot {
  key: string;
  assetType: string;
  label: string;
  uri: string | null;
}

export function itemToFormValues(item: ApiItem): ItemFormValues {
  return {
    brand: item.brand,
    modelName: item.modelName,
    category: item.category,
    serialNumber: item.serialNumber ?? "",
    purchaseDate: toDateInputValue(item.purchaseDate),
    purchasePrice: item.purchasePrice ?? "",
    currency: item.currency,
    storeName: item.storeName ?? "",
    warrantyType: item.warrantyType,
    warrantyProvider: item.warrantyProvider ?? "",
    warrantyDurationMonths: item.warrantyDurationMonths?.toString() ?? "",
    warrantyExpirationDate: toDateInputValue(item.warrantyExpirationDate),
    warrantyAssumed: item.warrantyAssumed,
    notes: item.notes ?? "",
  };
}

async function pickImage(fromCamera: boolean): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: "images",
    quality: 0.5,
    allowsEditing: false,
  };
  let result: ImagePicker.ImagePickerResult;
  if (fromCamera) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera access needed", "Allow camera access in Settings to photograph receipts.");
      return null;
    }
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    result = await ImagePicker.launchImageLibraryAsync(options);
  }
  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}

export function ItemForm({
  mode,
  itemId,
  initialValues,
  defaultCurrency = "USD",
  onSaved,
}: {
  mode: "create" | "edit";
  itemId?: string;
  initialValues?: ItemFormValues;
  defaultCurrency?: string;
  onSaved: (item: ApiItem) => void;
}) {
  const [values, setValues] = useState<ItemFormValues>({
    ...EMPTY,
    currency: defaultCurrency,
    ...(initialValues ?? {}),
  });
  const [slots, setSlots] = useState<PhotoSlot[]>(
    mode === "create"
      ? [
          { key: "receipt", assetType: "RECEIPT", label: "Receipt", uri: null },
          {
            key: "serial",
            assetType: "SERIAL_STICKER",
            label: "Serial sticker",
            uri: null,
          },
        ]
      : []
  );
  const [confidence, setConfidence] = useState<
    Record<string, "high" | "medium" | "low">
  >({});
  const [expiryTouched, setExpiryTouched] = useState(
    Boolean(initialValues?.warrantyExpirationDate)
  );
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof ItemFormValues>(
    key: K,
    value: ItemFormValues[K]
  ) {
    setValues((v) => {
      const next = { ...v, [key]: value };
      if (
        !expiryTouched &&
        (key === "purchaseDate" || key === "warrantyDurationMonths")
      ) {
        const months = parseInt(String(next.warrantyDurationMonths), 10);
        next.warrantyExpirationDate =
          DATE_RE.test(next.purchaseDate) && months > 0
            ? addMonthsToDateString(next.purchaseDate, months)
            : "";
      }
      return next;
    });
  }

  function choosePhoto(slotKey: string) {
    Alert.alert("Add photo", undefined, [
      {
        text: "Take photo",
        onPress: async () => {
          const uri = await pickImage(true);
          if (uri)
            setSlots((s) => s.map((x) => (x.key === slotKey ? { ...x, uri } : x)));
        },
      },
      {
        text: "Choose from library",
        onPress: async () => {
          const uri = await pickImage(false);
          if (uri)
            setSlots((s) => s.map((x) => (x.key === slotKey ? { ...x, uri } : x)));
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function runExtraction() {
    const withPhoto = slots.filter((s) => s.uri);
    if (withPhoto.length === 0) {
      Alert.alert("Add a photo first", "Photograph the receipt or serial sticker, then extract.");
      return;
    }
    setExtracting(true);
    try {
      const fd = new FormData();
      withPhoto.forEach((s, i) =>
        fd.append("images", filePart(s.uri!, `photo-${i}.jpg`))
      );
      const { result, mock } = await api<{
        result: ExtractionResult;
        mock: boolean;
      }>("/api/extract", { method: "POST", body: fd });

      const months = result.estimatedWarrantyMonths ?? 12;
      const assumed =
        result.warrantyAssumed || result.estimatedWarrantyMonths === null;

      setValues((v) => {
        const next: ItemFormValues = {
          ...v,
          brand: result.brand ?? v.brand,
          modelName: result.modelName ?? v.modelName,
          category: result.suggestedCategory ?? v.category,
          serialNumber: result.serialNumber ?? v.serialNumber,
          purchaseDate: result.purchaseDate ?? v.purchaseDate,
          purchasePrice:
            result.purchasePrice !== null
              ? String(result.purchasePrice)
              : v.purchasePrice,
          currency: result.currency ?? v.currency,
          storeName: result.storeName ?? v.storeName,
          warrantyDurationMonths: String(months),
          warrantyAssumed: assumed,
        };
        next.warrantyExpirationDate =
          DATE_RE.test(next.purchaseDate) && months > 0
            ? addMonthsToDateString(next.purchaseDate, months)
            : "";
        return next;
      });
      setConfidence(result.confidence ?? {});
      setExpiryTouched(false);
      setExtracted(true);
      if (mock) {
        Alert.alert(
          "Demo extraction",
          "No AI key is configured on the server, so this is sample data. Review and edit before saving."
        );
      }
    } catch (e) {
      Alert.alert("Extraction failed", e instanceof Error ? e.message : "Try again or fill the form manually.");
    } finally {
      setExtracting(false);
    }
  }

  async function save() {
    if (!values.brand.trim() || !values.modelName.trim()) {
      Alert.alert("Missing details", "Brand and model are required.");
      return;
    }
    for (const [field, label] of [
      ["purchaseDate", "Purchase date"],
      ["warrantyExpirationDate", "Warranty expiry"],
    ] as const) {
      if (values[field] && !DATE_RE.test(values[field])) {
        Alert.alert("Check dates", `${label} must be YYYY-MM-DD.`);
        return;
      }
    }

    setSaving(true);
    try {
      const fd = new FormData();
      for (const [k, v] of Object.entries(values)) {
        fd.append(k, typeof v === "boolean" ? (v ? "true" : "") : v);
      }
      for (const slot of slots) {
        if (slot.uri) {
          fd.append("assetFile", filePart(slot.uri, `${slot.key}.jpg`));
          fd.append("assetType", slot.assetType);
        }
      }
      const { item } = await api<{ item: ApiItem }>(
        mode === "create" ? "/api/items" : `/api/items/${itemId}`,
        { method: mode === "create" ? "POST" : "PATCH", body: fd }
      );
      onSaved(item);
    } catch (e) {
      Alert.alert("Save failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  const flag = (field: string) =>
    extracted && confidence[field] && confidence[field] !== "high"
      ? "check this"
      : undefined;

  return (
    <View style={{ gap: 16 }}>
      {mode === "create" && (
        <Card>
          <SectionTitle>Smart upload</SectionTitle>
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            Snap the receipt and serial sticker — AI fills in the form. Or skip
            and type everything below.
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {slots.map((slot) => (
              <Pressable
                key={slot.key}
                onPress={() => choosePhoto(slot.key)}
                style={styles.slot}
              >
                {slot.uri ? (
                  <Image source={{ uri: slot.uri }} style={styles.slotImage} />
                ) : (
                  <Text style={styles.slotHint}>＋</Text>
                )}
                <Text style={styles.slotLabel}>{slot.label}</Text>
              </Pressable>
            ))}
          </View>
          <Button
            title={extracting ? "Reading photos…" : "✨ Extract details with AI"}
            variant="secondary"
            loading={extracting}
            disabled={!slots.some((s) => s.uri)}
            onPress={runExtraction}
          />
        </Card>
      )}

      {extracted && (
        <View style={styles.notice}>
          <Text style={{ color: colors.warning, fontSize: 13 }}>
            AI extraction is an assistant, not an authority — review every
            field before saving.
            {values.warrantyAssumed
              ? " No warranty length was visible, so 12 months is suggested (assumed)."
              : ""}
          </Text>
        </View>
      )}

      <Card>
        <SectionTitle>Product</SectionTitle>
        <Field
          label="Brand *"
          hint={flag("brand")}
          value={values.brand}
          onChangeText={(t) => set("brand", t)}
          placeholder="Samsung"
        />
        <Field
          label="Model *"
          hint={flag("modelName")}
          value={values.modelName}
          onChangeText={(t) => set("modelName", t)}
          placeholder="WW90T534DAW"
        />
        <View style={{ gap: 6 }}>
          <Text style={styles.groupLabel}>Category</Text>
          <ChipRow
            options={CATEGORIES}
            value={values.category as (typeof CATEGORIES)[number]}
            onChange={(v) => set("category", v)}
            labels={CATEGORY_LABELS}
          />
        </View>
        <Field
          label="Serial number"
          hint={flag("serialNumber")}
          value={values.serialNumber}
          onChangeText={(t) => set("serialNumber", t)}
          placeholder="S/N on the product sticker"
          autoCapitalize="characters"
        />
        <Field
          label="Notes"
          value={values.notes}
          onChangeText={(t) => set("notes", t)}
          placeholder="Support phone, where it's installed…"
          multiline
        />
      </Card>

      <Card>
        <SectionTitle>Purchase</SectionTitle>
        <Field
          label="Purchase date"
          hint={flag("purchaseDate")}
          value={values.purchaseDate}
          onChangeText={(t) => set("purchaseDate", t)}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
        />
        <Field
          label="Store"
          hint={flag("storeName")}
          value={values.storeName}
          onChangeText={(t) => set("storeName", t)}
          placeholder="Where you bought it"
        />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 2 }}>
            <Field
              label="Price"
              hint={flag("purchasePrice")}
              value={values.purchasePrice}
              onChangeText={(t) => set("purchasePrice", t)}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Currency"
              value={values.currency}
              onChangeText={(t) => set("currency", t.toUpperCase())}
              placeholder="USD"
              maxLength={3}
              autoCapitalize="characters"
            />
          </View>
        </View>
      </Card>

      <Card>
        <SectionTitle>Warranty</SectionTitle>
        <View style={{ gap: 6 }}>
          <Text style={styles.groupLabel}>Type</Text>
          <ChipRow
            options={WARRANTY_TYPES}
            value={values.warrantyType as (typeof WARRANTY_TYPES)[number]}
            onChange={(v) => set("warrantyType", v)}
            labels={WARRANTY_TYPE_LABELS}
          />
        </View>
        <Field
          label="Provider"
          value={values.warrantyProvider}
          onChangeText={(t) => set("warrantyProvider", t)}
          placeholder="Who honours the claim"
        />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Months"
              hint={values.warrantyAssumed ? "assumed" : flag("estimatedWarrantyMonths")}
              value={values.warrantyDurationMonths}
              onChangeText={(t) => {
                set("warrantyDurationMonths", t);
                if (values.warrantyAssumed) set("warrantyAssumed", false);
              }}
              placeholder="12"
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 2 }}>
            <Field
              label="Expires on"
              value={values.warrantyExpirationDate}
              onChangeText={(t) => {
                setExpiryTouched(true);
                set("warrantyExpirationDate", t);
              }}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>
      </Card>

      <Button
        title={saving ? "Saving…" : mode === "create" ? "Save to vault" : "Save changes"}
        loading={saving}
        onPress={save}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: colors.background,
    minHeight: 120,
  },
  slotImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 24,
    width: "100%",
  },
  slotHint: { fontSize: 28, color: colors.muted },
  slotLabel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    textAlign: "center",
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "600",
    color: colors.foreground,
    backgroundColor: colors.card,
  },
  notice: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#f0dcae",
    padding: 12,
  },
  groupLabel: { fontSize: 13, fontWeight: "600", color: colors.foreground },
});
