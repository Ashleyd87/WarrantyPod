import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { api, filePart, type ExtractionResult } from "@/lib/api";
import { addFlow } from "@/lib/add-flow";
import { fonts, ink } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import { Mono, Overline, Pill } from "@/components/ui";

type Mode = "product" | "serial" | "barcode" | "receipt";

const MODE_META: Record<Mode, { label: string; caption: string; assetType: string }> = {
  product: {
    label: "Product",
    caption: "Photograph the product — this becomes its picture",
    assetType: "PRODUCT_PHOTO",
  },
  serial: {
    label: "Serial",
    caption: "Align the serial sticker inside the frame",
    assetType: "SERIAL_STICKER",
  },
  barcode: {
    label: "Barcode",
    caption: "Point at the barcode — it reads automatically",
    assetType: "SERIAL_STICKER",
  },
  receipt: {
    label: "Receipt",
    caption: "Lay the receipt flat and fill the frame",
    assetType: "RECEIPT",
  },
};

/** 1-D product/serial symbologies plus QR, which some makers now use. */
const BARCODE_TYPES = [
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
  "code39",
  "code93",
  "code128",
  "itf14",
  "codabar",
  "qr",
  "datamatrix",
] as const;

export default function CameraScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [mode, setMode] = useState<Mode>("serial");
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [detected, setDetected] = useState<{
    value: string;
    confidence: string;
    kind: "serial" | "barcode";
  } | null>(null);
  const [count, setCount] = useState(addFlow.peekCount());
  // Guards against the scanner firing dozens of times per second on one label.
  const lastScan = useRef<string>("");

  const scanY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanY, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scanY]);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  async function capture() {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    setDetected(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.55 });
      if (!photo?.uri) return;
      setLastCapture(photo.uri);
      addFlow.addPhoto({ uri: photo.uri, assetType: MODE_META[mode].assetType });
      setCount(addFlow.peekCount());

      if (mode === "serial") {
        // Run OCR on the sticker right away so the "detected" sheet can show.
        try {
          const fd = new FormData();
          fd.append("images", filePart(photo.uri, "serial.jpg"));
          const { result } = await api<{ result: ExtractionResult }>(
            "/api/extract",
            { method: "POST", body: fd }
          );
          if (result.serialNumber) {
            setDetected({
              value: result.serialNumber,
              confidence: result.confidence?.serialNumber ?? "medium",
              kind: "serial",
            });
          }
        } catch {
          // OCR failing is fine — the photo is still captured.
        }
      }
    } finally {
      setBusy(false);
    }
  }

  /** Live barcode reads — no shutter press needed in barcode mode. */
  function onBarcode({ data }: { data: string }) {
    const value = data?.trim();
    if (!value || value === lastScan.current) return;
    lastScan.current = value;
    setDetected({ value, confidence: "high", kind: "barcode" });
  }

  function acceptDetected() {
    if (!detected) return;
    if (detected.kind === "barcode") {
      addFlow.setBarcode(detected.value);
      // A UPC/EAN identifies the product, not the unit, so it must not be
      // filed as a serial number. Longer codes are usually the serial.
      if (!/^\d{8}$|^\d{12,14}$/.test(detected.value)) {
        addFlow.setSerial(detected.value);
      }
    } else {
      addFlow.setSerial(detected.value);
    }
    router.replace("/add/form");
  }

  function close() {
    if (addFlow.peekCount() > 0) router.replace("/add/form");
    else router.back();
  }

  if (!permission?.granted) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: ink.viewfinder,
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          gap: 18,
        }}
      >
        <Feather name="camera-off" size={40} color="rgba(255,255,255,0.6)" />
        <Text
          style={{
            fontFamily: fonts.semibold,
            fontSize: 15,
            color: "#FFFFFF",
            textAlign: "center",
          }}
        >
          Camera access is needed to scan stickers and receipts.
        </Text>
        <Pill label="Allow camera" variant="white" height={50} onPress={requestPermission} />
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: "rgba(255,255,255,0.6)" }}>
            Go back
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const frameH = 196;

  return (
    <View style={{ flex: 1, backgroundColor: ink.viewfinder }}>
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
        onBarcodeScanned={mode === "barcode" ? onBarcode : undefined}
      />

      {/* Overlay */}
      <SafeAreaView
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: "space-between",
        }}
        pointerEvents="box-none"
      >
        {/* Top row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 22,
            paddingTop: 8,
          }}
        >
          <OverlayCircle onPress={close}>
            <Feather name="x" size={20} color="#FFFFFF" />
          </OverlayCircle>
          <View
            style={{
              backgroundColor: ink.overlayPill,
              borderRadius: 999,
              paddingHorizontal: 16,
              paddingVertical: 10,
            }}
          >
            <Text style={{ fontFamily: fonts.bold, fontSize: 13.5, color: "#FFFFFF" }}>
              {count > 0 ? `${count} captured · ` : ""}
              {MODE_META[mode].label} mode
            </Text>
          </View>
          <OverlayCircle onPress={() => setTorch((v) => !v)}>
            <Feather
              name="zap"
              size={18}
              color={torch ? t.cameraAccent : "rgba(255,255,255,0.75)"}
            />
          </OverlayCircle>
        </View>

        {/* Scan frame */}
        <View style={{ alignItems: "center", gap: 18 }} pointerEvents="none">
          <View style={{ width: 306, height: frameH }}>
            {(["tl", "tr", "bl", "br"] as const).map((corner) => (
              <View
                key={corner}
                style={{
                  position: "absolute",
                  width: 36,
                  height: 36,
                  borderColor: t.cameraAccent,
                  ...(corner === "tl" && {
                    top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16,
                  }),
                  ...(corner === "tr" && {
                    top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16,
                  }),
                  ...(corner === "bl" && {
                    bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16,
                  }),
                  ...(corner === "br" && {
                    bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16,
                  }),
                }}
              />
            ))}
            {(mode === "serial" || mode === "barcode") && (
              <Animated.View
                style={{
                  position: "absolute",
                  left: -18,
                  right: -18,
                  top: 8,
                  height: 2.5,
                  borderRadius: 2,
                  backgroundColor: t.cameraAccent,
                  shadowColor: t.cameraAccent,
                  shadowOpacity: 0.9,
                  shadowRadius: 8,
                  transform: [
                    {
                      translateY: scanY.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, frameH - 18],
                      }),
                    },
                  ],
                }}
              />
            )}
          </View>
          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: 13,
              color: "rgba(255,255,255,0.65)",
            }}
          >
            {MODE_META[mode].caption}
          </Text>
        </View>

        {/* Bottom sheet + controls */}
        <View style={{ paddingHorizontal: 22, paddingBottom: 16, gap: 16 }}>
          {detected && (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 22,
                padding: 18,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View style={{ flex: 1, gap: 5 }}>
                <Overline>
                  {detected.kind === "barcode" ? "Barcode read" : "Serial detected"}
                </Overline>
                <Mono size={16} weight="medium">
                  {detected.value}
                </Mono>
              </View>
              <View
                style={{
                  backgroundColor: t.accentStrong,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ fontFamily: fonts.bold, fontSize: 12.5, color: t.onAccent }}>
                  {detected.kind === "barcode"
                    ? "scanned"
                    : detected.confidence === "high"
                      ? "98% match"
                      : "likely match"}
                </Text>
              </View>
              <Pressable
                onPress={acceptDetected}
                style={({ pressed }) => ({
                  backgroundColor: ink.ink,
                  borderRadius: 999,
                  height: 44,
                  paddingHorizontal: 22,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: "#FFFFFF" }}>
                  Use
                </Text>
              </Pressable>
            </View>
          )}

          {/* Mode chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              flexDirection: "row",
              justifyContent: "center",
              gap: 10,
              paddingHorizontal: 4,
              flexGrow: 1,
            }}
          >
            {(Object.keys(MODE_META) as Mode[]).map((m) => {
              const active = m === mode;
              return (
                <Pressable
                  key={m}
                  onPress={() => {
                    setMode(m);
                    setDetected(null);
                    lastScan.current = "";
                  }}
                  style={{
                    backgroundColor: active ? t.cameraAccent : ink.overlayPill,
                    borderRadius: 999,
                    paddingHorizontal: 16,
                    paddingVertical: 11,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 14,
                      color: active ? t.onCameraAccent : "#FFFFFF",
                    }}
                  >
                    {MODE_META[m].label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Shutter row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 18,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: "rgba(255,255,255,0.35)",
                overflow: "hidden",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {lastCapture ? (
                <Image source={{ uri: lastCapture }} style={{ width: "100%", height: "100%" }} />
              ) : (
                <Mono size={9} color="rgba(255,255,255,0.5)">
                  IMG
                </Mono>
              )}
            </View>
            <Pressable
              onPress={capture}
              disabled={busy}
              style={({ pressed }) => ({
                width: 74,
                height: 74,
                borderRadius: 37,
                borderWidth: 3,
                borderColor: "rgba(255,255,255,0.35)",
                alignItems: "center",
                justifyContent: "center",
                transform: [{ scale: pressed ? 0.94 : 1 }],
              })}
            >
              <View
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 29,
                  backgroundColor: "#FFFFFF",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {busy && <ActivityIndicator size="small" color={ink.ink} />}
              </View>
            </Pressable>
            <OverlayCircle
              onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
            >
              <Feather name="refresh-cw" size={18} color="#FFFFFF" />
            </OverlayCircle>
          </View>

          {count > 0 && (
            <Pill
              label={`Continue with ${count} photo${count === 1 ? "" : "s"}`}
              arrow
              variant="white"
              height={50}
              onPress={() => router.replace("/add/form")}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function OverlayCircle({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: ink.overlayPill,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}
