import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { api, filePart, type ApiItem, type ExtractionResult } from "@/lib/api";
import type { PendingPhoto } from "@/lib/add-flow";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  WARRANTY_TYPES,
  WARRANTY_TYPE_LABELS,
} from "@/lib/constants";
import { addMonthsToDateString, DATE_RE, toDateInputValue } from "@/lib/format";
import { fonts, ink } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import {
  AddTile,
  ChipRow,
  Field,
  Mono,
  Pill,
  SectionLabel,
} from "./ui";

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

const PHOTO_LABELS: Record<string, string> = {
  RECEIPT: "receipt",
  SERIAL_STICKER: "serial",
  PRODUCT_PHOTO: "product",
  OTHER: "photo",
};

export function ItemForm({
  mode,
  itemId,
  initialValues,
  initialPhotos = [],
  initialSerial = null,
  defaultCurrency = "USD",
  autoExtract = false,
  onSaved,
}: {
  mode: "create" | "edit";
  itemId?: string;
  initialValues?: ItemFormValues;
  initialPhotos?: PendingPhoto[];
  initialSerial?: string | null;
  defaultCurrency?: string;
  autoExtract?: boolean;
  onSaved: (item: ApiItem) => void;
}) {
  const { t } = useTheme();
  const [values, setValues] = useState<ItemFormValues>({
    ...EMPTY,
    currency: defaultCurrency,
    ...(initialValues ?? {}),
    ...(initialSerial ? { serialNumber: initialSerial } : {}),
  });
  const [photos, setPhotos] = useState<PendingPhoto[]>(initialPhotos);
  const [confidence, setConfidence] = useState<
    Record<string, "high" | "medium" | "low">
  >({});
  const [expiryTouched, setExpiryTouched] = useState(
    Boolean(initialValues?.warrantyExpirationDate)
  );
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [saving, setSaving] = useState(false);
  const autoRan = useRef(false);

  function set<K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) {
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

  const runExtraction = useCallback(
    async (list: PendingPhoto[]) => {
      if (list.length === 0) {
        Alert.alert("Add a photo first", "Attach the receipt or serial sticker, then extract.");
        return;
      }
      setExtracting(true);
      try {
        const fd = new FormData();
        list.slice(0, 4).forEach((p, i) => fd.append("images", filePart(p.uri, `photo-${i}.jpg`)));
        const { result, mock } = await api<{ result: ExtractionResult; mock: boolean }>(
          "/api/extract",
          { method: "POST", body: fd }
        );
        const months = result.estimatedWarrantyMonths ?? 12;
        const assumed = result.warrantyAssumed || result.estimatedWarrantyMonths === null;
        setValues((v) => {
          const next: ItemFormValues = {
            ...v,
            brand: result.brand ?? v.brand,
            modelName: result.modelName ?? v.modelName,
            category: result.suggestedCategory ?? v.category,
            serialNumber: v.serialNumber || (result.serialNumber ?? ""),
            purchaseDate: result.purchaseDate ?? v.purchaseDate,
            purchasePrice:
              result.purchasePrice !== null ? String(result.purchasePrice) : v.purchasePrice,
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
            "No AI key is configured on the server, so this is sample data. Review before saving."
          );
        }
      } catch (e) {
        Alert.alert(
          "Extraction failed",
          e instanceof Error ? e.message : "Fill the form manually or try again."
        );
      } finally {
        setExtracting(false);
      }
    },
    []
  );

  useEffect(() => {
    if (autoExtract && initialPhotos.length > 0 && !autoRan.current) {
      autoRan.current = true;
      runExtraction(initialPhotos);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addPhoto() {
    Alert.alert("Add photo", undefined, [
      {
        text: "Take photo",
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) return;
          const r = await ImagePicker.launchCameraAsync({ mediaTypes: "images", quality: 0.55 });
          if (!r.canceled && r.assets?.[0]) {
            setPhotos((p) => [...p, { uri: r.assets[0].uri, assetType: "OTHER" }]);
          }
        },
      },
      {
        text: "Choose from library",
        onPress: async () => {
          const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.55 });
          if (!r.canceled && r.assets?.[0]) {
            setPhotos((p) => [...p, { uri: r.assets[0].uri, assetType: "OTHER" }]);
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
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
      photos.forEach((p, i) => {
        fd.append("assetFile", filePart(p.uri, `${PHOTO_LABELS[p.assetType] ?? "photo"}-${i}.jpg`));
        fd.append("assetType", p.assetType);
      });
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
    <View style={{ gap: 22 }}>
      {mode === "create" && (
        <View style={{ gap: 12 }}>
          <SectionLabel>Proof</SectionLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {photos.map((p, i) => (
              <Pressable
                key={`${p.uri}-${i}`}
                onLongPress={() =>
                  Alert.alert("Remove photo?", undefined, [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Remove",
                      style: "destructive",
                      onPress: () => setPhotos((list) => list.filter((_, j) => j !== i)),
                    },
                  ])
                }
                style={{ width: 98, gap: 4 }}
              >
                <Image
                  source={{ uri: p.uri }}
                  style={{ width: 98, height: 72, borderRadius: 14, backgroundColor: ink.placeholder }}
                />
                <Mono size={9} color={ink.placeholderText}>
                  {PHOTO_LABELS[p.assetType] ?? "photo"}.jpg
                </Mono>
              </Pressable>
            ))}
            <AddTile width={98} height={72} onPress={addPhoto} />
          </View>
          <Pill
            label={extracting ? "Reading your photos…" : "Extract details with AI"}
            icon={
              extracting ? undefined : (
                <Ionicons name="sparkles-outline" size={17} color={t.onAccent} />
              )
            }
            loading={extracting}
            disabled={photos.length === 0}
            height={50}
            onPress={() => runExtraction(photos)}
          />
        </View>
      )}

      {extracted && (
        <View
          style={{
            backgroundColor: ink.card,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: ink.cardBorder,
            padding: 14,
            flexDirection: "row",
            gap: 10,
          }}
        >
          <Ionicons name="sparkles-outline" size={16} color={t.accentText} />
          <Text
            style={{
              flex: 1,
              fontFamily: fonts.regular,
              fontSize: 13,
              lineHeight: 19,
              color: ink.textSecondary,
            }}
          >
            AI filled this in — review every field before saving.
            {values.warrantyAssumed
              ? " No warranty length was visible, so 12 months is suggested (assumed)."
              : ""}
          </Text>
        </View>
      )}

      <View style={{ gap: 14 }}>
        <SectionLabel>Product</SectionLabel>
        <Field
          label="Brand *"
          hint={flag("brand")}
          value={values.brand}
          onChangeText={(v) => set("brand", v)}
          placeholder="LG"
        />
        <Field
          label="Model *"
          hint={flag("modelName")}
          value={values.modelName}
          onChangeText={(v) => set("modelName", v)}
          placeholder={'C3 OLED 55"'}
        />
        <View style={{ gap: 7 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: ink.ink }}>
            Category
          </Text>
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
          onChangeText={(v) => set("serialNumber", v)}
          placeholder="S/N on the sticker"
          autoCapitalize="characters"
          style={{ fontFamily: fonts.mono, letterSpacing: 1 }}
        />
        <Field
          label="Notes"
          value={values.notes}
          onChangeText={(v) => set("notes", v)}
          placeholder="Support phone, where it's installed…"
          multiline
        />
      </View>

      <View style={{ gap: 14 }}>
        <SectionLabel>Purchase</SectionLabel>
        <Field
          label="Purchase date"
          hint={flag("purchaseDate")}
          value={values.purchaseDate}
          onChangeText={(v) => set("purchaseDate", v)}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
        />
        <Field
          label="Store"
          hint={flag("storeName")}
          value={values.storeName}
          onChangeText={(v) => set("storeName", v)}
          placeholder="Where you bought it"
        />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 2 }}>
            <Field
              label="Price"
              hint={flag("purchasePrice")}
              value={values.purchasePrice}
              onChangeText={(v) => set("purchasePrice", v)}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Currency"
              value={values.currency}
              onChangeText={(v) => set("currency", v.toUpperCase())}
              maxLength={3}
              autoCapitalize="characters"
            />
          </View>
        </View>
      </View>

      <View style={{ gap: 14 }}>
        <SectionLabel>Warranty</SectionLabel>
        <View style={{ gap: 7 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: ink.ink }}>
            Type
          </Text>
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
          onChangeText={(v) => set("warrantyProvider", v)}
          placeholder="Who honours the claim"
        />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Months"
              hint={values.warrantyAssumed ? "assumed" : flag("estimatedWarrantyMonths")}
              value={values.warrantyDurationMonths}
              onChangeText={(v) => {
                set("warrantyDurationMonths", v);
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
              onChangeText={(v) => {
                setExpiryTouched(true);
                set("warrantyExpirationDate", v);
              }}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>
      </View>

      <Pill
        label={saving ? "Saving…" : mode === "create" ? "Save to vault" : "Save changes"}
        variant="ink"
        arrow
        loading={saving}
        onPress={save}
      />
    </View>
  );
}
