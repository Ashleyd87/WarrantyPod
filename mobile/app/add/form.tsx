import React, { useCallback, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type ApiSettings } from "@/lib/api";
import { addFlow, type PendingPhoto } from "@/lib/add-flow";
import { ink, SCREEN_PAD } from "@/lib/theme";
import { Header } from "@/components/Header";
import { ItemForm } from "@/components/ItemForm";
import { Headline } from "@/components/ui";

export default function AddFormScreen() {
  const router = useRouter();
  const [currency, setCurrency] = useState("USD");
  // Photos/serial captured in the camera or email screens.
  const flowRef = useRef<{ photos: PendingPhoto[]; serial: string | null }>(
    addFlow.takeAll()
  );

  useFocusEffect(
    useCallback(() => {
      api<{ settings: ApiSettings }>("/api/settings")
        .then((d) => setCurrency(d.settings.currency))
        .catch(() => {});
    }, [])
  );

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
          <Header title="Add to vault" back />
          <Headline>Check the details,{"\n"}then save.</Headline>
          <ItemForm
            mode="create"
            defaultCurrency={currency}
            initialPhotos={flowRef.current.photos}
            initialSerial={flowRef.current.serial}
            autoExtract={flowRef.current.photos.length > 0}
            onSaved={(item) => router.replace(`/item/${item.id}`)}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
