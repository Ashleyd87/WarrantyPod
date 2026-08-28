import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { vault, type VaultItemView } from "@/lib/vault";
import { ink, SCREEN_PAD } from "@/lib/theme";
import { Header } from "@/components/Header";
import { ItemForm, itemToFormValues } from "@/components/ItemForm";
import { Headline, LoadingScreen } from "@/components/ui";

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<VaultItemView | null>(null);

  useEffect(() => {
    vault
      .getItem(id)
      .then((found) => (found ? setItem(found) : router.back()))
      .catch(() => router.back());
  }, [id, router]);

  if (!item) return <LoadingScreen />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ink.paper }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: SCREEN_PAD,
            paddingTop: 10,
            paddingBottom: 60,
            gap: 22,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Header title="Edit item" back />
          <Headline>
            {item.brand} {item.modelName}
          </Headline>
          <ItemForm
            mode="edit"
            itemId={item.id}
            initialValues={itemToFormValues(item)}
            defaultCurrency={item.currency}
            onSaved={() => router.back()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
