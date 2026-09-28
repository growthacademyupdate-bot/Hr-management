"use client";

import { useMemo } from "react";
import { useDB, api, useAuth } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/useDataTable";
import { SortableHeader } from "@/components/SortableHeader";
import { DataTablePagination } from "@/components/DataTablePagination";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "Active Now": "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium",
    Present: "bg-success/15 text-success border-success/20",
    Absent: "bg-destructive/15 text-destructive border-destructive/20",
    Leave: "bg-warning/15 text-warning border-warning/20",
    "Half Day": "bg-info/15 text-info border-info/20",
    "Short Day": "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
    Incomplete: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
    Pending: "bg-muted text-muted-foreground border-border",
    Active: "bg-success/15 text-success border-success/20",
    Inactive: "bg-muted text-muted-foreground border-border",
    "On Leave": "bg-warning/15 text-warning border-warning/20",
    "working_progress": "bg-info/15 text-info border-info/20",
    completed: "bg-success/15 text-success border-success/20",
    reviewed: "bg-success/15 text-success border-success/20",
    assigned: "bg-warning/15 text-warning border-warning/20",
    low: "bg-info/15 text-info border-info/20",
    medium: "bg-warning/15 text-warning border-warning/20",
    high: "bg-destructive/15 text-destructive border-destructive/20",
    urgent: "bg-destructive/15 text-destructive border-destructive/20",
  };
  return (
    <Badge variant="outline" className={cn("inline-flex items-center gap-1.5", map[status] || "")}>
      {status === "Active Now" && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      )}
      {status}
    </Badge>
  );
}

function formatDuration(seconds?: number) {
  if (!seconds) return "0h 0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function EmployeeActivityTable() {
  const db = useDB();
  const today = new Date().toISOString().slice(0, 10);
  const employeeIds = new Set(db.employees.map(e => e.id));
  const todayAtt = db.attendance.filter((a) => a.date === today && employeeIds.has(a.employeeId));

  const activityData = useMemo(() => {
    return db.employees.map((emp) => {
      const att = todayAtt.find((a) => a.employeeId === emp.id);
      const activeSession = att?.sessions?.find((s: any) => !s.logoutAt);
      const isOnline = Boolean(activeSession);
      const onLeave = db.leaves.some(l => l.employeeId === emp.id && l.status === "admin_approved" && l.startDate <= today && l.endDate >= today);

      let status = "Absent";
      if (isOnline) {
        status = "Active Now";
      } else if (att) {
        status = att.status === "Incomplete" ? "Present" : att.status;
      } else if (onLeave) {
        status = "Leave";
      }

      const ongoingSeconds = activeSession ? Math.max(0, Math.floor((Date.now() - new Date(activeSession.loginAt).getTime()) / 1000)) : 0;
      const totalSecs = (att?.totalWorkingSeconds || (att?.workingHours ? att.workingHours * 3600 : 0)) + ongoingSeconds;

      return {
        id: emp.id,
        attendanceId: att?.id,
        name: emp.name,
        avatar: emp.avatar,
        department: emp.department,
        status,
        isOnline,
        firstLoginAt: att?.firstLoginAt,
        loginTime: att?.firstLoginAt ? new Date(att.firstLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (att?.loginTime || "—"),
        lastLogoutAt: att?.lastLogoutAt,
        logoutTime: isOnline ? "Active Now" : (att?.lastLogoutAt ? new Date(att.lastLogoutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (att?.logoutTime || "—")),
        workingSeconds: totalSecs,
        hoursLabel: totalSecs > 0 ? formatDuration(totalSecs) : "0h 0m",
        productivity: att?.productivity || 0,
      };
    });
  }, [db.employees, db.leaves, todayAtt, today]);

  const { search, setSearch, sortField, sortOrder, toggleSort, page, setPage, pageSize, setPageSize, totalPages, totalItems, startIndex, endIndex, paginatedData } = useDataTable({
    data: activityData,
    searchFields: (e) => [e.name, e.id, e.department, e.status, e.loginTime, e.logoutTime],
    defaultSortField: "name",
    defaultSortOrder: "asc",
    defaultPageSize: 5,
  });

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <CardTitle>Attendance Overview</CardTitle>
        <div className="relative w-full sm:w-64">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search employee activity..." className="pl-9 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="name" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Employee</SortableHeader>
                <SortableHeader field="loginTime" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Login Time</SortableHeader>
                <SortableHeader field="logoutTime" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Logout Time</SortableHeader>
                <SortableHeader field="workingSeconds" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Working Hours</SortableHeader>
                <SortableHeader field="status" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Status</SortableHeader>
                <SortableHeader field="productivity" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort} className="w-32">Productivity</SortableHeader>
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No matching activity.</TableCell></TableRow>
              ) : paginatedData.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={emp.avatar} />
                          <AvatarFallback>{emp.name[0]}</AvatarFallback>
                        </Avatar>
                        {emp.isOnline && (
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" title="Online" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{emp.name}</div>
                        <div className="text-xs text-muted-foreground">{emp.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{emp.loginTime}</TableCell>
                  <TableCell>{emp.logoutTime}</TableCell>
                  <TableCell>{emp.hoursLabel}</TableCell>
                  <TableCell><StatusBadge status={emp.status} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={emp.productivity} className="h-2 w-16" />
                      <span className="text-[10px] font-medium tabular-nums">{emp.productivity}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {emp.attendanceId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={async () => {
                          if (confirm("Are you sure you want to delete this attendance record?")) {
                            try {
                              await api.deleteAttendance(emp.attendanceId);
                              toast.success("Attendance record deleted");
                            } catch (error) {
                              toast.error("Failed to delete attendance record");
                            }
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination page={page} pageSize={pageSize} totalPages={totalPages} totalItems={totalItems} startIndex={startIndex} endIndex={endIndex} onPageChange={setPage} onPageSizeChange={setPageSize} pageSizeOptions={[5, 10, 20]} />
      </CardContent>
    </Card>
  );
}
