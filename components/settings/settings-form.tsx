"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateSettings } from "@/app/actions/misc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { REMINDER_LEAD_OPTIONS } from "@/lib/constants";

export function SettingsForm({
  reminderLeadDays,
  currency,
}: {
  reminderLeadDays: number;
  currency: string;
}) {
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateSettings(fd);
      if (res?.error) toast.error(res.error);
      else toast.success("Settings saved");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reminders</CardTitle>
        <CardDescription>
          How far ahead of a warranty expiry you want to be alerted.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="reminderLeadDays">Remind me</Label>
              <Select
                id="reminderLeadDays"
                name="reminderLeadDays"
                defaultValue={String(reminderLeadDays)}
              >
                {REMINDER_LEAD_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} days before
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Default currency</Label>
              <Input
                id="currency"
                name="currency"
                defaultValue={currency}
                maxLength={3}
                className="uppercase"
              />
            </div>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
