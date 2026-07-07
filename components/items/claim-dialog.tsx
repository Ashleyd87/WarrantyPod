"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FilePlus2, Pencil } from "lucide-react";
import { createClaim, updateClaim } from "@/app/actions/claims";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CLAIM_STATUSES, CLAIM_STATUS_LABELS } from "@/lib/constants";

export interface ClaimData {
  id: string;
  status: string;
  claimNumber: string | null;
  providerContact: string | null;
  issueDescription: string;
  resolutionNotes: string | null;
}

export function ClaimDialog({
  itemId,
  claim,
}: {
  itemId: string;
  claim?: ClaimData;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const editing = Boolean(claim);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = editing
        ? await updateClaim(claim!.id, fd)
        : await createClaim(itemId, fd);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Claim updated" : "Claim started");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="ghost" size="sm">
            <Pencil /> Update
          </Button>
        ) : (
          <Button size="sm">
            <FilePlus2 /> Start a claim
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Update claim" : "Start a warranty claim"}</DialogTitle>
          <DialogDescription>
            Track the claim from first contact through to resolution.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="issueDescription">What&apos;s wrong? *</Label>
            <Textarea
              id="issueDescription"
              name="issueDescription"
              required
              defaultValue={claim?.issueDescription ?? ""}
              placeholder="Describe the fault, when it started, what you've tried…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue={claim?.status ?? "DRAFT"}>
                {CLAIM_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {CLAIM_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="claimNumber">Claim / ref number</Label>
              <Input
                id="claimNumber"
                name="claimNumber"
                defaultValue={claim?.claimNumber ?? ""}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="providerContact">Provider contact</Label>
            <Input
              id="providerContact"
              name="providerContact"
              defaultValue={claim?.providerContact ?? ""}
              placeholder="Support email / phone / portal URL"
            />
          </div>
          {editing && (
            <div className="space-y-2">
              <Label htmlFor="resolutionNotes">Resolution notes</Label>
              <Textarea
                id="resolutionNotes"
                name="resolutionNotes"
                defaultValue={claim?.resolutionNotes ?? ""}
                placeholder="Outcome, replacement details, refund amount…"
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Saving…" : editing ? "Save claim" : "Create claim"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
