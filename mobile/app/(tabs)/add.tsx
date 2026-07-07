import React, { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type ApiSettings } from "@/lib/api";
import { colors, spacing } from "@/lib/theme";
import { ItemForm } from "@/components/ItemForm";

export default function AddScreen() {
  const router = useRouter();
  const [currency, setCurrency] = useState("USD");
  // Remounting the form on each visit gives a clean slate after a save.
  const [formKey, setFormKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      api<{ settings: ApiSettings }>("/api/settings")
        .then((d) => setCurrency(d.settings.currency))
        .catch(() => {});
    }, [])
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing(4), gap: spacing(4) }}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: "800", color: colors.foreground }}>
            Add a product
          </Text>
          <Text style={{ color: colors.muted }}>
            Photos first, AI fills the form — or type it in yourself.
          </Text>
        </View>
        <ItemForm
          key={formKey}
          mode="create"
          defaultCurrency={currency}
          onSaved={(item) => {
            setFormKey((k) => k + 1);
            router.push(`/item/${item.id}`);
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
