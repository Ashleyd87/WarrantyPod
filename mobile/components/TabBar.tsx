import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { fonts, ink, SCREEN_PAD } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";

const TAB_META: Record<string, { label: string; icon: (color: string) => React.ReactNode }> = {
  index: {
    label: "Home",
    icon: (c) => <Feather name="home" size={20} color={c} />,
  },
  items: {
    label: "Items",
    icon: (c) => <Feather name="grid" size={20} color={c} />,
  },
  claims: {
    label: "Claims",
    icon: (c) => (
      <Ionicons name="shield-checkmark-outline" size={21} color={c} />
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

/** Floating accent pill bar; active tab = white pill with ink icon + label. */
export function TabBar({ state, navigation }: TabBarProps) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: SCREEN_PAD,
        right: SCREEN_PAD,
        bottom: Math.max(insets.bottom, 12),
      }}
    >
      <View
        style={{
          height: 64,
          borderRadius: 999,
          backgroundColor: t.accent,
          padding: 6,
          flexDirection: "row",
          alignItems: "center",
          // Mono theme: black bar on white screens needs no border; fine.
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
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
                style={{
                  height: 52,
                  borderRadius: 999,
                  backgroundColor: "#FFFFFF",
                  paddingHorizontal: 22,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 9,
                }}
              >
                {meta.icon(ink.ink)}
                <Text
                  style={{ fontFamily: fonts.bold, fontSize: 15, color: ink.ink }}
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
              {meta.icon(t.navInactive)}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
