import { ItemForm } from "@/components/items/item-form";
import { getOrCreateSettings, requireUser } from "@/lib/session";

export const metadata = { title: "Add product" };

export default async function NewItemPage() {
  const user = await requireUser();
  const settings = await getOrCreateSettings(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add a product</h1>
        <p className="text-sm text-muted-foreground">
          Photos first, AI fills the form — or type it all in yourself.
        </p>
      </div>
      <ItemForm mode="create" defaultCurrency={settings.currency} />
    </div>
  );
}
