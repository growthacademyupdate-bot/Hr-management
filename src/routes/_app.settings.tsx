import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="System preferences" />
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle>Preferences</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { l: "Email notifications", d: "Receive task & leave updates by email" },
              { l: "Activity tracking", d: "Track employee activity automatically" },
              { l: "Two-factor authentication", d: "Add an extra layer of security" },
              { l: "Weekly report email", d: "Get a productivity summary every Monday" },
            ].map((s) => (
              <div key={s.l} className="flex items-center justify-between gap-4 py-2 border-b last:border-0">
                <div>
                  <Label className="text-sm font-medium">{s.l}</Label>
                  <p className="text-xs text-muted-foreground">{s.d}</p>
                </div>
                <Switch defaultChecked />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle>Data</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Reset all demo data back to its original seed values.</p>
            <Button variant="destructive" onClick={() => { api.resetDB(); toast.success("Demo data reset"); }}>Reset Demo Data</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
