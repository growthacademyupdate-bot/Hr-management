"use client";

import { PageHeader } from "@/components/PageHeader";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Settings" 
        description="Manage your account settings and preferences." 
      />
      <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        Settings module coming soon.
      </div>
    </div>
  );
}
