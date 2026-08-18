"use client";

import { PageHeader } from "@/components/PageHeader";

export default function LeavesPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Leaves" 
        description="Manage employee leave requests and balances." 
      />
      <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        Leaves module coming soon.
      </div>
    </div>
  );
}
