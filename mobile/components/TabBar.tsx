import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { fonts, ink, SCREEN_PAD } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";

const TAB_META: Record<
  string,
  { label: string; icon: (color: string, size: number) => React.ReactNode }
> = {
  index: {
    label: "Home",
    icon: (c, s) => <Feather name="home" size={s} color={c} />,
  },
  items: {
    label: "Items",
    icon: (c, s) => <Feather name="grid" size={s} color={c} />,
  },
  claims: {
    label: "Claims",
    icon: (c, s) => (
      <Ionicons name="shield-checkmark-outline" size={s + 1} color={c} />
    ),
  },
};

// Minimal structural slice of BottomTabBarProps (the full type lives in a
// nested @react-navigation package that isn't hoisted for direct import).
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (e: {
      type: "tabPress";
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

/** Floating 64px ink pill bar; active tab = accent pill with ink icon + label. */
export function TabBar({ state, navigation }: TabBarProps) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: SCREEN_PAD + 4,
        right: SCREEN_PAD + 4,
        bottom: Math.max(insets.bottom, 12) + 10,
      }}
    >
      <View
        style={{
          height: 64,
          borderRadius: 999,
          backgroundColor: ink.ink,
          padding: 6,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        }}
      >
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          if (focused) {
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={({ pressed }) => ({
                  height: 52,
                  borderRadius: 999,
                  backgroundColor: t.accentOnInk,
                  paddingHorizontal: 22,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 9,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                {meta.icon(t.onAccentOnInk, 18)}
                <Text
                  style={{
                    fontFamily: fonts.bold,
                    fontSize: 14,
                    color: t.onAccentOnInk,
                  }}
                >
                  {meta.label}
                </Text>
              </Pressable>
            );
          }
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => ({
                flex: 1,
                height: 52,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              {meta.icon("#FFFFFF", 20)}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
