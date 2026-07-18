import React from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { authClient } from "@/lib/auth-client";
import { fonts, ink } from "@/lib/theme";
import { Avatar, CircleBtn } from "./ui";

/**
 * Standard screen header: 44px circles, centered title, avatar top-RIGHT
 * (always). Pass `back` for the outlined back circle on the left.
 */
export function Header({
  title,
  back = false,
  left,
  right,
  center,
}: {
  title?: string;
  back?: boolean;
  left?: React.ReactNode;
  right?: React.ReactNode;
  center?: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const letter = (session?.user.name || session?.user.email || "?").charAt(0);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 44,
      }}
    >
      <View style={{ width: 44 }}>
        {left ??
          (back ? (
            <CircleBtn
              icon={<Feather name="chevron-left" size={20} color={ink.ink} />}
              onPress={() => router.back()}
            />
          ) : null)}
      </View>
      <View style={{ flex: 1, alignItems: "center" }}>
        {center ??
          (title ? (
            <Text
              style={{ fontFamily: fonts.bold, fontSize: 16, color: ink.ink }}
              numberOfLines={1}
            >
              {title}
            </Text>
          ) : null)}
      </View>
      <View style={{ width: 44, alignItems: "flex-end" }}>
        {right ?? <Avatar letter={letter} onPress={() => router.push("/profile")} />}
      </View>
    </View>
  );
}
