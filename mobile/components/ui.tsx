import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { fonts, ink } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";

/* ---------- Text presets ---------- */

export function Headline({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) {
  return (
    <Text
      style={[
        {
          fontFamily: fonts.extrabold,
          fontSize: 27,
          lineHeight: 32,
          letterSpacing: -0.4,
          color: ink.ink,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function SectionLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) {
  return (
    <Text
      style={[
        { fontFamily: fonts.bold, fontSize: 15, color: ink.ink },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Overline({
  children,
  color = ink.textSecondary,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <Text
      style={{
        fontFamily: fonts.semibold,
        fontSize: 10.5,
        letterSpacing: 1.4,
        textTransform: "uppercase",
        color,
      }}
    >
      {children}
    </Text>
  );
}

export function Mono({
  children,
  size = 13,
  color = ink.ink,
  weight = "regular",
  style,
}: {
  children: React.ReactNode;
  size?: number;
  color?: string;
  weight?: "regular" | "medium" | "semibold";
  style?: TextStyle;
}) {
  const family =
    weight === "semibold"
      ? fonts.monoSemibold
      : weight === "medium"
        ? fonts.monoMedium
        : fonts.mono;
  return (
    <Text
      style={[
        { fontFamily: family, fontSize: size, letterSpacing: 1, color },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/* ---------- Pill button (primary CTA) ---------- */

export function Pill({
  label,
  onPress,
  variant = "accent",
  height = 56,
  arrow = false,
  icon,
  loading = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "accent" | "ink" | "white" | "welcome";
  height?: number;
  arrow?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const { t } = useTheme();
  const bg =
    variant === "accent"
      ? t.accent
      : variant === "ink"
        ? ink.ink
        : variant === "welcome"
          ? t.welcomeBtnBg
          : ink.paper;
  const fg =
    variant === "accent"
      ? t.onAccent
      : variant === "ink"
        ? "#FFFFFF"
        : variant === "welcome"
          ? t.welcomeBtnText
          : ink.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          height,
          borderRadius: 999,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 10,
          paddingHorizontal: 26,
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon}
      <Text
        style={{
          fontFamily: fonts.bold,
          fontSize: height >= 56 ? 16 : 15,
          color: fg,
        }}
      >
        {label}
      </Text>
      {arrow && !loading && (
        <Feather name="arrow-right" size={18} color={fg} />
      )}
    </Pressable>
  );
}

/* ---------- Chips ---------- */

export function Chip({
  label,
  kind = "outline",
  onInk = false,
  size = "md",
}: {
  label: string;
  kind?: "outline" | "ink" | "accent";
  /** Render on a dark/ink surface (adjusts outline + accent colors). */
  onInk?: boolean;
  size?: "sm" | "md";
}) {
  const { t } = useTheme();
  let bg = "transparent";
  let fg = onInk ? "#FFFFFF" : ink.chipOutlineText;
  let borderColor = onInk ? ink.onInkBorder : ink.chipBorder;
  let borderWidth = 1;
  if (kind === "ink") {
    bg = ink.ink;
    fg = "#FFFFFF";
    borderWidth = 0;
  } else if (kind === "accent") {
    bg = onInk ? t.accentOnInkBg : t.accent;
    fg = onInk ? t.accentOnInkText : t.onAccent;
    borderWidth = 0;
  }
  const pad = size === "sm" ? { h: 10, v: 5 } : { h: 13, v: 7 };
  return (
    <View
      style={{
        backgroundColor: bg,
        borderColor,
        borderWidth,
        borderRadius: 999,
        paddingHorizontal: pad.h,
        paddingVertical: pad.v,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          fontFamily: fonts.semibold,
          fontSize: size === "sm" ? 11.5 : 12.5,
          color: fg,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function ChipRow<T extends string | number>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Record<string, string>;
}) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={String(opt)}
            onPress={() => onChange(opt)}
            style={({ pressed }) => ({
              backgroundColor: active ? t.accent : ink.paper,
              borderColor: active ? t.accent : ink.chipBorder,
              borderWidth: 1,
              borderRadius: 999,
              paddingHorizontal: 13,
              paddingVertical: 8,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: fonts.semibold,
                fontSize: 12.5,
                color: active ? t.onAccent : ink.chipOutlineText,
              }}
            >
              {labels?.[String(opt)] ?? String(opt)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- Cards & list groups ---------- */

export function Card({
  children,
  style,
  radius = 20,
  inkBg = false,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  radius?: number;
  inkBg?: boolean;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: inkBg ? ink.ink : ink.card,
          borderRadius: radius,
          borderWidth: inkBg ? 0 : 1,
          borderColor: ink.cardBorder,
          padding: 18,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** 22px-radius list container: 6px outer padding, hairline row dividers. */
export function ListGroup({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const items = React.Children.toArray(children);
  return (
    <View
      style={[
        {
          backgroundColor: ink.card,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: ink.cardBorder,
          padding: 6,
        },
        style,
      ]}
    >
      {items.map((child, i) => (
        <React.Fragment key={i}>
          {child}
          {i < items.length - 1 && (
            <View
              style={{
                height: 1,
                backgroundColor: ink.hairline,
                marginHorizontal: 12,
              }}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

export function ChevronCircle({ size = 34 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: ink.paper,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Feather name="chevron-right" size={17} color={ink.ink} />
    </View>
  );
}

/* ---------- Circle buttons & avatar ---------- */

export function CircleBtn({
  icon,
  onPress,
  size = 44,
  filled = false,
  borderless = false,
  style,
}: {
  icon: React.ReactNode;
  onPress?: () => void;
  size?: number;
  filled?: boolean;
  borderless?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: filled ? ink.paper : "transparent",
          borderWidth: borderless || filled ? 0 : 1.5,
          borderColor: ink.controlBorder,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}

export function Avatar({
  letter,
  size = 44,
  onPress,
}: {
  letter: string;
  size?: number;
  onPress?: () => void;
}) {
  const { t } = useTheme();
  const dot = Math.round(size * 0.23);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: ink.avatarBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontFamily: fonts.extrabold,
            fontSize: Math.round(size * 0.36),
            color: ink.ink,
          }}
        >
          {letter.toUpperCase()}
        </Text>
      </View>
      <View
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: t.accent,
          borderWidth: 2,
          borderColor: ink.paper,
        }}
      />
    </Pressable>
  );
}

/* ---------- Progress ---------- */

export function ProgressBar({ fraction }: { fraction: number }) {
  const { t } = useTheme();
  return (
    <View
      style={{
        height: 8,
        borderRadius: 999,
        backgroundColor: ink.progressTrack,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${Math.min(100, Math.max(3, fraction * 100))}%`,
          height: "100%",
          borderRadius: 999,
          backgroundColor: t.accent,
        }}
      />
    </View>
  );
}

/* ---------- Form field ---------- */

export function Field({
  label,
  hint,
  ...inputProps
}: TextInputProps & { label: string; hint?: string }) {
  const { t } = useTheme();
  return (
    <View style={{ gap: 7 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text
          style={{ fontFamily: fonts.semibold, fontSize: 13, color: ink.ink }}
        >
          {label}
        </Text>
        {hint ? (
          <Text
            style={{
              fontFamily: fonts.semibold,
              fontSize: 11.5,
              color: t.accentText,
            }}
          >
            {hint}
          </Text>
        ) : null}
      </View>
      <TextInput
        placeholderTextColor={ink.textMuted}
        selectionColor={t.accent}
        {...inputProps}
        style={[
          {
            borderWidth: 1.5,
            borderColor: ink.controlBorder,
            borderRadius: 18,
            backgroundColor: ink.paper,
            paddingHorizontal: 15,
            paddingVertical: 13,
            fontFamily: fonts.medium,
            fontSize: 14.5,
            color: ink.ink,
          },
          inputProps.style,
        ]}
      />
    </View>
  );
}

/* ---------- Placeholder tile (photo slots) ---------- */

export function PlaceholderTile({
  label,
  width,
  height,
  radius = 14,
}: {
  label: string;
  width?: number | `${number}%`;
  height: number;
  radius?: number;
}) {
  return (
    <View
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: ink.placeholder,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <Mono size={10} color={ink.placeholderText}>
        {label}
      </Mono>
    </View>
  );
}

export function AddTile({
  onPress,
  width,
  height,
  radius = 14,
}: {
  onPress: () => void;
  width?: number | `${number}%`;
  height: number;
  radius?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width,
        height,
        borderRadius: radius,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: ink.chipBorder,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Feather name="plus" size={20} color={ink.textSecondary} />
    </Pressable>
  );
}

/* ---------- Misc ---------- */

export function LoadingScreen() {
  const { t } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: ink.paper,
      }}
    >
      <ActivityIndicator
        size="large"
        color={t.accent === "#FFFFFF" ? ink.ink : t.accent}
      />
    </View>
  );
}

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body?: string;
}) {
  return (
    <Card style={{ alignItems: "center", gap: 6, paddingVertical: 34 }}>
      <Text style={{ fontFamily: fonts.extrabold, fontSize: 16, color: ink.ink }}>
        {title}
      </Text>
      {body ? (
        <Text
          style={{
            fontFamily: fonts.regular,
            fontSize: 13.5,
            lineHeight: 20,
            color: ink.textSecondary,
            textAlign: "center",
          }}
        >
          {body}
        </Text>
      ) : null}
    </Card>
  );
}

export const styles = StyleSheet.create({});
