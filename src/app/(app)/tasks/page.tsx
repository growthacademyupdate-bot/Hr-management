"use client";

import { PageHeader } from "@/components/PageHeader";

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Tasks" 
        description="Assign, track, and manage employee tasks." 
      />
      <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        Tasks module coming soon.
      </div>
    </div>
  );
}
