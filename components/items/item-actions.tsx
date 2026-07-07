"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, FileDown, Pencil, Trash2 } from "lucide-react";
import { deleteItem, toggleArchiveItem } from "@/app/actions/items";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ItemActions({
  itemId,
  itemName,
  archived,
}: {
  itemId: string;
  itemName: string;
  archived: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="secondary" size="sm">
        <a href={`/api/items/${itemId}/claim-package`} download>
          <FileDown /> Claim package (PDF)
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href={`/vault/${itemId}/edit`}>
          <Pencil /> Edit
        </Link>
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const res = await toggleArchiveItem(itemId);
            if (res?.error) toast.error(res.error);
            else toast.success(archived ? "Restored" : "Archived");
          })
        }
      >
        {archived ? (
          <>
            <ArchiveRestore /> Restore
          </>
        ) : (
          <>
            <Archive /> Archive
          </>
        )}
      </Button>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-destructive">
            <Trash2 /> Delete
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {itemName}?</DialogTitle>
            <DialogDescription>
              This permanently removes the product, its photos and claim
              history. There is no undo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const res = await deleteItem(itemId);
                  if (res?.error) toast.error(res.error);
                })
              }
            >
              Delete permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
