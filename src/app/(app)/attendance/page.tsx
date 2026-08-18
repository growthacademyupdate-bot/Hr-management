"use client";

import { PageHeader } from "@/components/PageHeader";

export default function AttendancePage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Attendance" 
        description="View and manage employee attendance records." 
      />
      <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        Attendance module coming soon.
      </div>
    </div>
  );
}
