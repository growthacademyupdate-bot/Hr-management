"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth, useDB, useGlobalSearch, api } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/dashboard/SharedDashboardComponents";
import { format, parseISO } from "date-fns";
import { useDataTable } from "@/hooks/useDataTable";
import { SortableHeader } from "@/components/SortableHeader";
import { DataTablePagination } from "@/components/DataTablePagination";

function formatDuration(seconds?: number) {
  if (!seconds) return "0h 0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function AttendancePage() {
  const user = useAuth();
  const db = useDB();
  const globalSearch = useGlobalSearch();
  const [filterDate, setFilterDate] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  const isAdminOrHR = user?.role === "admin" || user?.role === "hr";

  const rawRecords = useMemo(() => {
    let list = db.attendance.map((att) => {
      const emp = db.employees.find((e) => e.id === att.employeeId);
      return {
        ...att,
        employee: emp,
        employeeName: emp?.name || "Unknown",
        employeeIdCode: emp?.id || att.employeeId,
      };
    });

    if (user && !isAdminOrHR) {
      list = list.filter((r) => r.employeeId === (user.employeeId || user.id));
    }

    if (filterDate) {
      list = list.filter((r) => r.date === filterDate);
    }

    return list;
  }, [db.attendance, db.employees, user, isAdminOrHR, filterDate]);

  const {
    search,
    setSearch,
    sortField,
    sortOrder,
    toggleSort,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    paginatedData,
  } = useDataTable({
    data: rawRecords,
    searchFields: (r) => {
      let formattedDate1 = "";
      let formattedDate2 = "";
      try {
        if (r.date) {
          const parsed = parseISO(r.date);
          formattedDate1 = format(parsed, "dd MMM, yyyy");
          formattedDate2 = format(parsed, "MMM dd, yyyy");
        }
      } catch (e) {}

      const firstLoginStr = r.firstLoginAt ? format(new Date(r.firstLoginAt), "hh:mm a") : (r.loginTime || "");
      const lastLogoutStr = r.lastLogoutAt ? format(new Date(r.lastLogoutAt), "hh:mm a") : (r.logoutTime || "");
      const totalHoursStr = r.totalWorkingSeconds ? formatDuration(r.totalWorkingSeconds) : `${r.workingHours || 0}h`;

      return [
        r.employeeName,
        r.employeeIdCode,
        r.date,
        formattedDate1,
        formattedDate2,
        r.status,
        firstLoginStr,
        lastLogoutStr,
        totalHoursStr,
      ];
    },
    defaultSortField: "date",
    defaultSortOrder: "desc",
  });

  useEffect(() => {
    setSearch(globalSearch);
  }, [globalSearch, setSearch]);

  if (!user) return null;

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this attendance record?")) return;
    try {
      await api.deleteAttendance(id);
      toast.success("Attendance record deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete record");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Attendance Management" 
        description={isAdminOrHR ? "View and manage employee attendance records." : "View your daily attendance and session history."} 
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search attendance..." 
            value={search} 
            onChange={(e) => {
              setSearch(e.target.value);
              api.setGlobalSearch(e.target.value);
            }} 
            className="pl-9 bg-card"
          />
        </div>
        <div className="flex items-center gap-2">
          <Input 
            type="date" 
            value={filterDate} 
            onChange={(e) => setFilterDate(e.target.value)} 
            className="w-48 bg-card" 
          />
          {filterDate && (
            <Button variant="ghost" onClick={() => setFilterDate("")}>Clear Date</Button>
          )}
        </div>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdminOrHR && (
                    <SortableHeader field="employeeName" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>
                      Employee
                    </SortableHeader>
                  )}
                  <SortableHeader field="date" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>
                    Date
                  </SortableHeader>
                  <SortableHeader field="firstLoginAt" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>
                    First Login
                  </SortableHeader>
                  <SortableHeader field="lastLogoutAt" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>
                    Last Logout
                  </SortableHeader>
                  <SortableHeader field="totalWorkingSeconds" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>
                    Total Hours
                  </SortableHeader>
                  <SortableHeader field="status" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>
                    Status
                  </SortableHeader>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdminOrHR ? 7 : 6} className="text-center h-32 text-muted-foreground">
                      No attendance records found.
                    </TableCell>
                  </TableRow>
                ) : paginatedData.map((record) => (
                  <TableRow key={record.id}>
                    {isAdminOrHR && (
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={record.employee?.avatar} />
                            <AvatarFallback>{record.employee?.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{record.employee?.name}</div>
                            <div className="text-xs text-muted-foreground">{record.employee?.id}</div>
                          </div>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      {format(parseISO(record.date), "dd MMM, yyyy")}
                    </TableCell>
                    <TableCell>
                      {record.firstLoginAt ? format(new Date(record.firstLoginAt), "hh:mm a") : record.loginTime || "—"}
                    </TableCell>
                    <TableCell>
                      {record.sessions?.some((s: any) => !s.logoutAt) ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs">Active Now</span>
                      ) : (
                        record.lastLogoutAt ? format(new Date(record.lastLogoutAt), "hh:mm a") : record.logoutTime || "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const activeSession = record.sessions?.find((s: any) => !s.logoutAt);
                        const ongoingSecs = activeSession ? Math.max(0, Math.floor((Date.now() - new Date(activeSession.loginAt).getTime()) / 1000)) : 0;
                        const totalSecs = (record.totalWorkingSeconds || (record.workingHours ? record.workingHours * 3600 : 0)) + ongoingSecs;
                        return (
                          <Badge variant="secondary" className="font-mono">
                            {totalSecs > 0 ? formatDuration(totalSecs) : `${record.workingHours || 0}h`}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={record.sessions?.some((s: any) => !s.logoutAt) ? "Active Now" : (record.status || "Absent")} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedRecord(record)}>
                          View Sessions
                        </Button>
                        {isAdminOrHR && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(record.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DataTablePagination
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      <Dialog open={!!selectedRecord} onOpenChange={(o) => !o && setSelectedRecord(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Session History</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 text-sm">
                <div className="text-muted-foreground">Date:</div>
                <div className="font-medium text-right">{format(parseISO(selectedRecord.date), "dd MMM, yyyy")}</div>
                {isAdminOrHR && (
                  <>
                    <div className="text-muted-foreground">Employee:</div>
                    <div className="font-medium text-right">{selectedRecord.employee?.name}</div>
                  </>
                )}
                <div className="text-muted-foreground">Total Working Time:</div>
                <div className="font-medium text-right text-primary">
                  {selectedRecord.totalWorkingSeconds ? formatDuration(selectedRecord.totalWorkingSeconds) : `${selectedRecord.workingHours || 0}h`}
                </div>
              </div>
              
              <div className="rounded-md border bg-muted/40">
                <div className="p-3 font-medium border-b text-sm">Login Sessions</div>
                <div className="p-3 space-y-3">
                  {(!selectedRecord.sessions || selectedRecord.sessions.length === 0) ? (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      Legacy record. No detailed session data available.
                    </div>
                  ) : (
                    selectedRecord.sessions.map((session: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-sm p-2 rounded bg-background border">
                        <div>
                          <div className="font-medium">Session {i + 1}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(session.loginAt), "hh:mm a")} - {session.logoutAt ? format(new Date(session.logoutAt), "hh:mm a") : "Active"}
                          </div>
                        </div>
                        <Badge variant="secondary" className="font-mono">
                          {formatDuration(session.durationSeconds)}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
