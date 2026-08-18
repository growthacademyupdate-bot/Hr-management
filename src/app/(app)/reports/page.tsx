"use client";

import { PageHeader } from "@/components/PageHeader";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Reports" 
        description="Generate and view performance and attendance reports." 
      />
      <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        Reports module coming soon.
      </div>
    </div>
  );
}
