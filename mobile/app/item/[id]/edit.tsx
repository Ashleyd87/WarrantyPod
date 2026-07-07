import React, { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api, type ApiItem } from "@/lib/api";
import { spacing } from "@/lib/theme";
import { ItemForm, itemToFormValues } from "@/components/ItemForm";
import { LoadingScreen } from "@/components/ui";

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<ApiItem | null>(null);

  useEffect(() => {
    api<{ item: ApiItem }>(`/api/items/${id}`)
      .then((d) => setItem(d.item))
      .catch(() => router.back());
  }, [id, router]);

  if (!item) return <LoadingScreen />;

  return (
    <ScrollView contentContainerStyle={{ padding: spacing(4) }}>
      <ItemForm
        mode="edit"
        itemId={item.id}
        initialValues={itemToFormValues(item)}
        defaultCurrency={item.currency}
        onSaved={() => router.back()}
      />
    </ScrollView>
  );
}
