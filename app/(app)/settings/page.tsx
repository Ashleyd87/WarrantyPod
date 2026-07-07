import { Download } from "lucide-react";
import { SettingsForm } from "@/components/settings/settings-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isMockMode } from "@/lib/extraction";
import { getOrCreateSettings, requireUser } from "@/lib/session";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = await getOrCreateSettings(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>

      <SettingsForm
        reminderLeadDays={settings.reminderLeadDays}
        currency={settings.currency}
      />

      <Card>
        <CardHeader>
          <CardTitle>AI extraction</CardTitle>
          <CardDescription>
            {isMockMode()
              ? "Running in demo mode — no ANTHROPIC_API_KEY is configured, so extraction returns sample data. Add your key to .env and restart to enable real extraction."
              : `Live — receipts are read with ${process.env.ANTHROPIC_MODEL || "claude-sonnet-5"}. Images are sent to the Anthropic API only when you tap “Extract details with AI”.`}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export</CardTitle>
          <CardDescription>
            Download your full inventory — brands, models, serials, purchase
            and warranty data — as a CSV for insurance documentation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a href="/api/export/csv" download>
              <Download /> Export inventory CSV
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Install on your phone</CardTitle>
          <CardDescription>
            Warranty Vault is an installable app. On Android: Chrome menu →
            “Add to Home screen”. On iPhone: Safari share button → “Add to
            Home Screen”. It opens full-screen with its own icon.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
