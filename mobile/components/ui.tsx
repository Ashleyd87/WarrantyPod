import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { colors, radius, spacing } from "@/lib/theme";

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "destructive";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "destructive"
        ? colors.destructive
        : variant === "secondary"
          ? colors.primarySoft
          : colors.card;
  const fg =
    variant === "primary" || variant === "destructive"
      ? colors.onPrimary
      : variant === "secondary"
        ? colors.primary
        : colors.foreground;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderWidth: variant === "outline" ? 1 : 0,
          borderColor: colors.border,
          opacity: disabled || loading ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading && <ActivityIndicator size="small" color={fg} />}
      <Text style={{ color: fg, fontWeight: "600", fontSize: 15 }}>
        {title}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  ...inputProps
}: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <TextInput
        placeholderTextColor={colors.muted}
        {...inputProps}
        style={[styles.input, inputProps.style]}
      />
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
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={String(opt)}
            onPress={() => onChange(opt)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.primary : colors.card,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: active ? colors.onPrimary : colors.muted,
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

export function Badge({
  text,
  tone = "muted",
}: {
  text: string;
  tone?: "success" | "warning" | "destructive" | "muted" | "primary";
}) {
  const map = {
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    destructive: { bg: colors.destructiveSoft, fg: colors.destructive },
    primary: { bg: colors.primary, fg: colors.onPrimary },
    muted: { bg: "#eef1f3", fg: colors.muted },
  }[tone];
  return (
    <View
      style={{
        backgroundColor: map.bg,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 3,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color: map.fg, fontSize: 12, fontWeight: "700" }}>
        {text}
      </Text>
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body?: string;
}) {
  return (
    <Card style={{ alignItems: "center", gap: 6, paddingVertical: spacing(8) }}>
      <Text style={{ fontWeight: "700", fontSize: 16, color: colors.foreground }}>
        {title}
      </Text>
      {body ? (
        <Text style={{ color: colors.muted, textAlign: "center", fontSize: 14 }}>
          {body}
        </Text>
      ) : null}
    </Card>
  );
}

export function LoadingScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.foreground,
  },
  hint: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.warning,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.foreground,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(4),
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
});
