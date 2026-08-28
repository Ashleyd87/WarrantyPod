import React from "react";
import { Dimensions, Modal, Pressable, Text, View } from "react-native";
import { fonts, ink } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import { TOUR_STEPS, useTour } from "@/lib/tour-context";

const SCRIM = "rgba(11,11,11,0.72)";
const PAD = 8; // breathing room around a spotlit element
const CARD_GAP = 14;

/**
 * Coach-mark overlay. The "spotlight" is four scrim panels drawn around the
 * target rect rather than an SVG mask — no extra dependency, and the hole is
 * genuinely transparent so the highlighted UI reads normally.
 */
export function TourOverlay() {
  const { active, step, stepIndex, rect, next, stop } = useTour();
  const { t } = useTheme();
  const { width: SW, height: SH } = Dimensions.get("window");

  if (!active || !step) return null;

  const last = stepIndex === TOUR_STEPS.length - 1;
  const hole = rect
    ? {
        x: Math.max(0, rect.x - PAD),
        y: Math.max(0, rect.y - PAD),
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : null;

  // Place the card below the hole when there's room, else above it.
  const spaceBelow = hole ? SH - (hole.y + hole.height) : 0;
  const cardBelow = hole ? spaceBelow > 260 : false;

  const cardStyle = hole
    ? cardBelow
      ? { top: hole.y + hole.height + CARD_GAP }
      : { bottom: SH - hole.y + CARD_GAP }
    : { top: SH / 2 - 130 };

  return (
    <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={stop}>
      <View style={{ flex: 1 }}>
        {hole ? (
          <>
            <View
              style={{ position: "absolute", left: 0, right: 0, top: 0, height: hole.y, backgroundColor: SCRIM }}
            />
            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: hole.y + hole.height,
                bottom: 0,
                backgroundColor: SCRIM,
              }}
            />
            <View
              style={{ position: "absolute", left: 0, width: hole.x, top: hole.y, height: hole.height, backgroundColor: SCRIM }}
            />
            <View
              style={{
                position: "absolute",
                left: hole.x + hole.width,
                right: 0,
                top: hole.y,
                height: hole.height,
                backgroundColor: SCRIM,
              }}
            />
            {/* Accent ring around the spotlit element */}
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: hole.x,
                top: hole.y,
                width: hole.width,
                height: hole.height,
                borderRadius: 22,
                borderWidth: 2,
                borderColor: t.accentStrong === "#0B0B0B" ? "#FFFFFF" : t.accentStrong,
              }}
            />
          </>
        ) : (
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: SCRIM,
            }}
          />
        )}

        {/* Step card */}
        <View
          style={{
            position: "absolute",
            left: 18,
            right: 18,
            ...cardStyle,
            backgroundColor: ink.paper,
            borderRadius: 24,
            padding: 20,
            gap: 10,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.medium,
              fontSize: 11,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: ink.textSecondary,
            }}
          >
            Step {stepIndex + 1} of {TOUR_STEPS.length}
          </Text>
          <Text style={{ fontFamily: fonts.extrabold, fontSize: 19, letterSpacing: -0.3, color: ink.ink }}>
            {step.title}
          </Text>
          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: 14,
              lineHeight: 21,
              color: ink.textSecondary,
            }}
          >
            {step.body}
          </Text>

          {/* Progress dots */}
          <View style={{ flexDirection: "row", gap: 6, marginTop: 2 }}>
            {TOUR_STEPS.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === stepIndex ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i === stepIndex ? ink.ink : ink.chipBorder,
                }}
              />
            ))}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 }}>
            <Pressable onPress={stop} hitSlop={10}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 13.5, color: ink.textSecondary }}>
                {last ? "Close" : "Skip tour"}
              </Text>
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={next}
              style={({ pressed }) => ({
                height: 46,
                paddingHorizontal: 26,
                borderRadius: 999,
                backgroundColor: ink.ink,
                alignItems: "center",
                justifyContent: "center",
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: "#FFFFFF" }}>
                {last ? "Done" : "Next"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
