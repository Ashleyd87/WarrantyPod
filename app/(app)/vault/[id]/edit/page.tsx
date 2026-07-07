import { notFound } from "next/navigation";
import { ItemForm } from "@/components/items/item-form";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { toDateInputValue } from "@/lib/utils";

export const metadata = { title: "Edit product" };

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const item = await prisma.productItem.findFirst({
    where: { id, userId: user.id },
  });
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Edit {item.brand} {item.modelName}
        </h1>
      </div>
      <ItemForm
        mode="edit"
        itemId={item.id}
        initialValues={{
          brand: item.brand,
          modelName: item.modelName,
          category: item.category,
          serialNumber: item.serialNumber ?? "",
          purchaseDate: toDateInputValue(item.purchaseDate),
          purchasePrice: item.purchasePrice?.toString() ?? "",
          currency: item.currency,
          storeName: item.storeName ?? "",
          warrantyType: item.warrantyType,
          warrantyProvider: item.warrantyProvider ?? "",
          warrantyDurationMonths: item.warrantyDurationMonths?.toString() ?? "",
          warrantyExpirationDate: toDateInputValue(item.warrantyExpirationDate),
          warrantyAssumed: item.warrantyAssumed,
          notes: item.notes ?? "",
        }}
      />
    </div>
  );
}
