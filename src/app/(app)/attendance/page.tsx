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

  const todayStr = useMemo(() => {
    const d = new Date();
    const dateStr = d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", year: 'numeric', month: '2-digit', day: '2-digit' });
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  }, []);

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

      const isToday = r.date === todayStr;
      const hasOpenSession = r.sessions?.some((s: any) => !s.logoutAt);
      const isForgotLogout = Boolean(r.isForgotLogout || r.logoutTime === "Forgot Logout" || (!isToday && hasOpenSession));
      const isActiveNow = isToday && hasOpenSession && !r.isForgotLogout;

      const firstLoginStr = r.firstLoginAt ? format(new Date(r.firstLoginAt), "hh:mm a") : (r.loginTime || "");
      const lastLogoutStr = isActiveNow
        ? "Active Now"
        : isForgotLogout
          ? "Forgot Logout"
          : (r.lastLogoutAt ? format(new Date(r.lastLogoutAt), "hh:mm a") : (r.logoutTime || ""));
      const statusStr = isActiveNow
        ? "Active Now"
        : isForgotLogout
          ? (r.status === "Late" || r.status === "Late (Forgot Logout)" ? "Late (Forgot Logout)" : "Forgot Logout")
          : (r.status || "Absent");
      const totalHoursStr = r.totalWorkingSeconds ? formatDuration(r.totalWorkingSeconds) : `${r.workingHours || 0}h`;

      return [
        r.employeeName,
        r.employeeIdCode,
        r.date,
        formattedDate1,
        formattedDate2,
        statusStr,
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
                      {(() => {
                        const isToday = record.date === todayStr;
                        const hasOpenSession = record.sessions?.some((s: any) => !s.logoutAt);
                        const isForgotLogout = Boolean(record.isForgotLogout || record.logoutTime === "Forgot Logout" || (!isToday && hasOpenSession));
                        const isActiveNow = isToday && hasOpenSession && !record.isForgotLogout;

                        if (isActiveNow) {
                          return <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs">Active Now</span>;
                        }
                        if (isForgotLogout) {
                          return (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-medium">
                              Forgot Logout
                            </Badge>
                          );
                        }
                        return record.lastLogoutAt ? format(new Date(record.lastLogoutAt), "hh:mm a") : record.logoutTime || "—";
                      })()}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const isToday = record.date === todayStr;
                        const hasOpenSession = record.sessions?.some((s: any) => !s.logoutAt);
                        const isForgotLogout = Boolean(record.isForgotLogout || record.logoutTime === "Forgot Logout" || (!isToday && hasOpenSession));
                        const isActiveNow = isToday && hasOpenSession && !record.isForgotLogout;

                        let totalSecs = record.totalWorkingSeconds || (record.workingHours ? record.workingHours * 3600 : 0);
                        if (isActiveNow) {
                          const activeSession = record.sessions?.find((s: any) => !s.logoutAt);
                          const ongoingSecs = activeSession ? Math.max(0, Math.floor((Date.now() - new Date(activeSession.loginAt).getTime()) / 1000)) : 0;
                          totalSecs += ongoingSecs;
                        } else if (isForgotLogout && (!totalSecs || totalSecs === 0)) {
                          if (record.firstLoginAt) {
                            const loginMs = new Date(record.firstLoginAt).getTime();
                            const shiftEndMs = new Date(`${record.date}T18:00:00+05:30`).getTime();
                            if (shiftEndMs > loginMs) totalSecs = Math.floor((shiftEndMs - loginMs) / 1000);
                          }
                        }
                        return (
                          <Badge variant="secondary" className="font-mono">
                            {totalSecs > 0 ? formatDuration(totalSecs) : `${record.workingHours || 0}h`}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const isToday = record.date === todayStr;
                        const hasOpenSession = record.sessions?.some((s: any) => !s.logoutAt);
                        const isForgotLogout = Boolean(record.isForgotLogout || record.logoutTime === "Forgot Logout" || (!isToday && hasOpenSession));
                        const isActiveNow = isToday && hasOpenSession && !record.isForgotLogout;

                        const displayStatus = isActiveNow
                          ? "Active Now"
                          : isForgotLogout
                            ? (record.status === "Late" || record.status === "Late (Forgot Logout)" ? "Late (Forgot Logout)" : "Forgot Logout")
                            : (record.status || "Absent");

                        return <StatusBadge status={displayStatus} />;
                      })()}
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
                  {(() => {
                    const isToday = selectedRecord.date === todayStr;
                    const hasOpenSession = selectedRecord.sessions?.some((s: any) => !s.logoutAt);
                    const isForgotLogout = Boolean(selectedRecord.isForgotLogout || selectedRecord.logoutTime === "Forgot Logout" || (!isToday && hasOpenSession));
                    const isActiveNow = isToday && hasOpenSession && !selectedRecord.isForgotLogout;

                    let totalSecs = selectedRecord.totalWorkingSeconds || (selectedRecord.workingHours ? selectedRecord.workingHours * 3600 : 0);
                    if (isActiveNow) {
                      const activeSession = selectedRecord.sessions?.find((s: any) => !s.logoutAt);
                      const ongoingSecs = activeSession ? Math.max(0, Math.floor((Date.now() - new Date(activeSession.loginAt).getTime()) / 1000)) : 0;
                      totalSecs += ongoingSecs;
                    } else if (isForgotLogout && (!totalSecs || totalSecs === 0)) {
                      if (selectedRecord.firstLoginAt) {
                        const loginMs = new Date(selectedRecord.firstLoginAt).getTime();
                        const shiftEndMs = new Date(`${selectedRecord.date}T18:00:00+05:30`).getTime();
                        if (shiftEndMs > loginMs) totalSecs = Math.floor((shiftEndMs - loginMs) / 1000);
                      }
                    }
                    return totalSecs > 0 ? formatDuration(totalSecs) : `${selectedRecord.workingHours || 0}h`;
                  })()}
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
                    selectedRecord.sessions.map((session: any, i: number) => {
                      const isSessionToday = selectedRecord.date === todayStr;
                      const isSessionOpen = !session.logoutAt;
                      const isSessionForgot = Boolean(session.forgotLogout || (!isSessionToday && isSessionOpen));
                      const isSessionActive = isSessionToday && isSessionOpen && !session.forgotLogout;

                      let sessionLogoutText = "—";
                      if (session.logoutAt && !session.forgotLogout) {
                        sessionLogoutText = format(new Date(session.logoutAt), "hh:mm a");
                      } else if (isSessionActive) {
                        sessionLogoutText = "Active";
                      } else if (isSessionForgot) {
                        sessionLogoutText = "Forgot Logout";
                      } else if (session.logoutAt) {
                        sessionLogoutText = format(new Date(session.logoutAt), "hh:mm a");
                      }

                      let dur = session.durationSeconds || 0;
                      if (isSessionActive) {
                        dur += Math.max(0, Math.floor((Date.now() - new Date(session.loginAt).getTime()) / 1000));
                      } else if (isSessionForgot && dur === 0) {
                        const loginMs = new Date(session.loginAt).getTime();
                        const shiftEndMs = new Date(`${selectedRecord.date}T18:00:00+05:30`).getTime();
                        if (shiftEndMs > loginMs) dur = Math.floor((shiftEndMs - loginMs) / 1000);
                      }

                      return (
                        <div key={i} className="flex justify-between items-center text-sm p-2 rounded bg-background border">
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              <span>Session {i + 1}</span>
                              {isSessionForgot && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30">
                                  Forgot Logout
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(session.loginAt), "hh:mm a")} - {sessionLogoutText}
                            </div>
                          </div>
                          <Badge variant="secondary" className="font-mono">
                            {formatDuration(dur)}
                          </Badge>
                        </div>
                      );
                    })
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
