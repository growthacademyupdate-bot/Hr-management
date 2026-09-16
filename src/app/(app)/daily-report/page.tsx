"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth, useDB, api, useGlobalSearch } from "@/lib/store";
import type { DailyReport } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/useDataTable";
import { SortableHeader } from "@/components/SortableHeader";
import { DataTablePagination } from "@/components/DataTablePagination";
import {
  ClipboardList,
  Calendar,
  CalendarDays,
  Clock,
  User,
  Briefcase,
  CheckCircle2,
  PhoneCall,
  Users,
  Search,
  Trash2,
  Eye,
  PlusCircle,
  History,
  SendHorizontal,
  FileCheck,
} from "lucide-react";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DIRECTOR_CALL_OPTIONS = [
  "-- Select Minutes --",
  "No Call / None",
  "5 Minutes",
  "10 Minutes",
  "15 Minutes",
  "20 Minutes",
  "30 Minutes",
  "45 Minutes",
  "60+ Minutes",
];

const INTERNAL_MEETING_OPTIONS = [
  "-- Select Meeting Timing --",
  "No Meeting / None",
  "15 Minutes",
  "30 Minutes",
  "45 Minutes",
  "1 Hour",
  "1.5 Hours",
  "2 Hours",
  "2+ Hours",
];

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calculateDayOfWeek(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-").map(Number);
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return DAYS_OF_WEEK[d.getDay()] || "";
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "" : DAYS_OF_WEEK[d.getDay()] || "";
}

function truncate(text: string, max = 55): string {
  if (!text) return "—";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export default function DailyReportPage() {
  const user = useAuth();
  const db = useDB();
  const globalSearch = useGlobalSearch();

  const isEmployee = user?.role === "employee";
  const [activeTab, setActiveTab] = useState<"form" | "history">(isEmployee ? "form" : "history");
  const [submitting, setSubmitting] = useState(false);
  const [viewReport, setViewReport] = useState<DailyReport | null>(null);

  const todayDate = useMemo(() => getTodayDateString(), []);
  const todayDay = useMemo(() => calculateDayOfWeek(todayDate), [todayDate]);

  const [form, setForm] = useState({
    employeeId: "",
    employeeName: "",
    designation: "",
    attendance: "Present",
    reportDate: todayDate,
    reportDay: todayDay,
    reportSlot1: "",
    reportSlot2: "",
    reportSlot3: "",
    reportSlot4: "",
    directorCallTiming: "-- Select Minutes --",
    internalMeeting: "-- Select Meeting Timing --",
  });

  useEffect(() => {
    if (!user) return;
    if (user.role === "employee") {
      const empId = user.employeeId || user.id;
      const emp = db.employees.find((e) => e.id === empId);
      setForm((prev) => ({
        ...prev,
        employeeId: emp?.id || empId,
        employeeName: emp?.name || user.name || "",
        designation: emp?.designation || "",
        reportDate: prev.reportDate || todayDate,
        reportDay: prev.reportDay || todayDay,
      }));
    }
  }, [user, db.employees, todayDate, todayDay]);

  const handleDateChange = (newDate: string) => {
    const newDay = calculateDayOfWeek(newDate);
    setForm((prev) => ({ ...prev, reportDate: newDate, reportDay: newDay }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId || !form.employeeName) {
      toast.error("Employee ID and Name are required.");
      return;
    }
    if (!form.reportDate || !form.reportDay) {
      toast.error("Report Date and Day are required.");
      return;
    }
    const hasContent =
      form.reportSlot1.trim() || form.reportSlot2.trim() || form.reportSlot3.trim() || form.reportSlot4.trim();
    if (!hasContent) {
      toast.error("Please enter at least one time slot report before submitting.");
      return;
    }
    try {
      setSubmitting(true);
      await api.addDailyReport({
        employeeId: form.employeeId,
        employeeName: form.employeeName,
        designation: form.designation || "Staff",
        reportDate: form.reportDate,
        reportDay: form.reportDay,
        attendance: form.attendance,
        reportSlot1: form.reportSlot1,
        reportSlot2: form.reportSlot2,
        reportSlot3: form.reportSlot3,
        reportSlot4: form.reportSlot4,
        directorCallTiming: form.directorCallTiming === "-- Select Minutes --" ? "" : form.directorCallTiming,
        internalMeeting: form.internalMeeting === "-- Select Meeting Timing --" ? "" : form.internalMeeting,
      });
      toast.success("Daily Task Report submitted successfully!");
      setForm((prev) => ({
        ...prev,
        reportSlot1: "",
        reportSlot2: "",
        reportSlot3: "",
        reportSlot4: "",
        directorCallTiming: "-- Select Minutes --",
        internalMeeting: "-- Select Meeting Timing --",
      }));
      setActiveTab("history");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to submit daily task report");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredHistory = useMemo(() => {
    if (!user) return [];
    let reports = db.dailyReports || [];
    if (user.role === "employee") {
      const myId = user.employeeId || user.id;
      reports = reports.filter((r) => r.employeeId === myId);
    }
    return reports;
  }, [db.dailyReports, user]);

  const {
    search, setSearch, sortField, sortOrder, toggleSort,
    page, setPage, pageSize, setPageSize,
    totalPages, totalItems, startIndex, endIndex, paginatedData,
  } = useDataTable({
    data: filteredHistory,
    searchFields: (r) => [
      r.employeeId, r.employeeName, r.designation,
      r.reportDate, r.reportDay, r.attendance,
      r.reportSlot1, r.reportSlot2, r.reportSlot3, r.reportSlot4,
    ],
    defaultSortField: "reportDate",
    defaultSortOrder: "desc",
  });

  useEffect(() => { setSearch(globalSearch); }, [globalSearch, setSearch]);

  const handleDelete = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this daily report?")) return;
    try {
      await api.deleteDailyReport(reportId);
      toast.success("Daily report deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete report");
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          title="Daily Task Report"
          description={
            isEmployee
              ? "Submit your daily work progress and meeting schedules."
              : "View all employee daily work reports — Staff Activity Log."
          }
        />
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border shrink-0">
          {isEmployee && (
            <Button
              size="sm"
              variant={activeTab === "form" ? "default" : "ghost"}
              className={`rounded-lg gap-2 text-xs font-semibold ${
                activeTab === "form" ? "shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("form")}
            >
              <PlusCircle className="h-4 w-4" />
              Submit Report
            </Button>
          )}
          <Button
            size="sm"
            variant={activeTab === "history" ? "default" : "ghost"}
            className={`rounded-lg gap-2 text-xs font-semibold ${
              activeTab === "history" ? "shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("history")}
          >
            <History className="h-4 w-4" />
            {isEmployee ? "My Reports" : "Staff Activity Log"}
            {filteredHistory.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] rounded-full">
                {filteredHistory.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* ── FORM (Employee Only) ── */}
      {isEmployee && activeTab === "form" && (
        <Card className="border border-border/80 shadow-md bg-card overflow-hidden">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold tracking-tight">Daily Task Report</CardTitle>
                  <CardDescription className="text-xs">
                    Please submit your daily accomplishments and schedule notes for today.
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="gap-1.5 px-3 py-1 text-xs font-medium bg-background">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                {form.reportDay || "Today"}, {form.reportDate}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Row 1: Employee ID & Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2"><User className="h-4 w-4 text-primary" />Employee ID</Label>
                  <Input value={form.employeeId} readOnly className="bg-muted/40 font-mono text-sm cursor-not-allowed border-border/80" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2"><User className="h-4 w-4 text-primary" />Employee Name</Label>
                  <Input value={form.employeeName} readOnly className="bg-muted/40 text-sm font-medium cursor-not-allowed border-border/80" />
                </div>
              </div>

              {/* Row 2: Designation & Attendance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" />Designation</Label>
                  <Input value={form.designation} readOnly className="bg-muted/40 text-sm cursor-not-allowed border-border/80" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Attendance</Label>
                  <Select value={form.attendance} onValueChange={(val) => setForm({ ...form, attendance: val })}>
                    <SelectTrigger className="bg-background border-border/80"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Present">Present</SelectItem>
                      <SelectItem value="Work From Home">Work From Home</SelectItem>
                      <SelectItem value="Half Day">Half Day</SelectItem>
                      <SelectItem value="On Leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: Report Day & Date (auto-filled) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-muted/20 border border-border/50">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" />Report Day</Label>
                    <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">Auto-filled</span>
                  </div>
                  <Input value={form.reportDay} readOnly className="bg-muted/40 font-medium cursor-not-allowed border-border/80" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />Report Date</Label>
                    <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">Auto-filled</span>
                  </div>
                  <Input type="date" value={form.reportDate} onChange={(e) => handleDateChange(e.target.value)} className="bg-background border-border/80 font-medium" />
                </div>
              </div>

              {/* Work Schedule */}
              <div className="pt-2 border-t border-border/60">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />Work Schedule Breakdown
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-indigo-500" />9:30 am - 11:00 am Report</Label>
                  <Textarea rows={3} placeholder="Describe tasks during 9:30 am - 11:00 am..." value={form.reportSlot1} onChange={(e) => setForm({ ...form, reportSlot1: e.target.value })} className="bg-background resize-y min-h-[90px] border-border/80 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-indigo-500" />11:20 am - 1:30 pm Report</Label>
                  <Textarea rows={3} placeholder="Describe tasks during 11:20 am - 1:30 pm..." value={form.reportSlot2} onChange={(e) => setForm({ ...form, reportSlot2: e.target.value })} className="bg-background resize-y min-h-[90px] border-border/80 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-indigo-500" />2:30 pm - 4:00 pm Report</Label>
                  <Textarea rows={3} placeholder="Describe tasks during 2:30 pm - 4:00 pm..." value={form.reportSlot3} onChange={(e) => setForm({ ...form, reportSlot3: e.target.value })} className="bg-background resize-y min-h-[90px] border-border/80 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-indigo-500" />4:00 pm - 7:00 pm Report</Label>
                  <Textarea rows={3} placeholder="Describe tasks during 4:00 pm - 7:00 pm..." value={form.reportSlot4} onChange={(e) => setForm({ ...form, reportSlot4: e.target.value })} className="bg-background resize-y min-h-[90px] border-border/80 text-sm" />
                </div>
              </div>

              {/* Calls & Meetings */}
              <div className="pt-2 border-t border-border/60">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <PhoneCall className="h-4 w-4 text-primary" />Calls &amp; Meetings
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2"><PhoneCall className="h-4 w-4 text-emerald-600" />Call Timing with Director</Label>
                  <Select value={form.directorCallTiming} onValueChange={(val) => setForm({ ...form, directorCallTiming: val })}>
                    <SelectTrigger className="bg-background border-border/80"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DIRECTOR_CALL_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-blue-600" />Internal Office Meeting</Label>
                  <Select value={form.internalMeeting} onValueChange={(val) => setForm({ ...form, internalMeeting: val })}>
                    <SelectTrigger className="bg-background border-border/80"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INTERNAL_MEETING_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={submitting} size="lg"
                  className="min-w-[200px] h-11 px-8 rounded-xl font-bold gap-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
                  {submitting ? (
                    <><div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />Submitting...</>
                  ) : (
                    <><SendHorizontal className="h-4 w-4" />Add Daily Report</>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── HISTORY / STAFF ACTIVITY LOG ── */}
      {activeTab === "history" && (
        <Card className="border border-border/80 shadow-sm bg-card overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60">
            <div>
              <CardTitle className="text-lg font-bold">
                {isEmployee ? "My Daily Reports" : "Staff Activity Log"}
              </CardTitle>
              <CardDescription className="text-xs">
                {isEmployee
                  ? "Your past daily task submissions"
                  : "All daily task reports submitted by employees — read-only"}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by employee, date, day..." className="pl-9 text-xs bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <SortableHeader field="reportDate" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Date</SortableHeader>
                    <SortableHeader field="reportDay" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Day</SortableHeader>
                    {!isEmployee && (
                      <>
                        <SortableHeader field="employeeName" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Employee Name</SortableHeader>
                        <TableHead>Designation</TableHead>
                      </>
                    )}
                    <SortableHeader field="attendance" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Attendance</SortableHeader>
                    <TableHead className="min-w-[160px]">9:30–11:00 am</TableHead>
                    <TableHead className="min-w-[160px]">11:20 am–1:30 pm</TableHead>
                    <TableHead className="min-w-[160px]">2:30–4:00 pm</TableHead>
                    <TableHead className="min-w-[160px]">4:00–7:00 pm</TableHead>
                    <TableHead className="min-w-[110px]">Director Call</TableHead>
                    <TableHead className="min-w-[110px]">Internal Meeting</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isEmployee ? 9 : 11} className="text-center py-12 text-muted-foreground">
                        <div className="max-w-xs mx-auto space-y-2">
                          <FileCheck className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                          <p className="font-semibold text-sm">No daily task reports found.</p>
                          {isEmployee && <p className="text-xs">Use &quot;Submit Report&quot; to log your daily activities.</p>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((report) => (
                      <TableRow key={report.id} className="hover:bg-muted/30 transition-colors align-top">
                        <TableCell className="font-medium whitespace-nowrap text-sm">{report.reportDate}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-medium text-xs whitespace-nowrap">{report.reportDay}</Badge>
                        </TableCell>
                        {!isEmployee && (
                          <>
                            <TableCell>
                              <div className="font-semibold text-sm">{report.employeeName}</div>
                              <div className="text-xs text-muted-foreground font-mono">{report.employeeId}</div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{report.designation || "—"}</TableCell>
                          </>
                        )}
                        <TableCell>
                          <Badge variant="outline" className={`text-xs whitespace-nowrap ${
                            report.attendance === "Present" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            : report.attendance === "Work From Home" ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                          }`}>{report.attendance}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-foreground/80 max-w-[160px]">
                          <span title={report.reportSlot1 || ""}>{truncate(report.reportSlot1)}</span>
                        </TableCell>
                        <TableCell className="text-xs text-foreground/80 max-w-[160px]">
                          <span title={report.reportSlot2 || ""}>{truncate(report.reportSlot2)}</span>
                        </TableCell>
                        <TableCell className="text-xs text-foreground/80 max-w-[160px]">
                          <span title={report.reportSlot3 || ""}>{truncate(report.reportSlot3)}</span>
                        </TableCell>
                        <TableCell className="text-xs text-foreground/80 max-w-[160px]">
                          <span title={report.reportSlot4 || ""}>{truncate(report.reportSlot4)}</span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{report.directorCallTiming || "None"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{report.internalMeeting || "None"}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" title="View Full Report" onClick={() => setViewReport(report)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(user.role === "admin" || user.role === "hr" || report.employeeId === (user.employeeId || user.id)) && (
                              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" title="Delete Report" onClick={() => handleDelete(report.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <DataTablePagination page={page} pageSize={pageSize} totalPages={totalPages} totalItems={totalItems} startIndex={startIndex} endIndex={endIndex} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </CardContent>
        </Card>
      )}

      {/* ── VIEW FULL REPORT MODAL ── */}
      {viewReport && (
        <Dialog open={!!viewReport} onOpenChange={(open) => !open && setViewReport(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />Daily Task Report Details
                </DialogTitle>
                <Badge variant="outline" className="text-xs">{viewReport.attendance}</Badge>
              </div>
              <DialogDescription className="text-xs">
                Submitted on {viewReport.reportDate} ({viewReport.reportDay})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-muted/40 rounded-xl border">
                <div><span className="text-[11px] text-muted-foreground block">Employee ID</span><span className="font-mono text-sm font-semibold">{viewReport.employeeId}</span></div>
                <div><span className="text-[11px] text-muted-foreground block">Employee Name</span><span className="text-sm font-semibold">{viewReport.employeeName}</span></div>
                <div><span className="text-[11px] text-muted-foreground block">Designation</span><span className="text-sm font-medium">{viewReport.designation || "—"}</span></div>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Task Breakdown</h4>
                {[
                  { label: "9:30 am - 11:00 am", value: viewReport.reportSlot1 },
                  { label: "11:20 am - 1:30 pm", value: viewReport.reportSlot2 },
                  { label: "2:30 pm - 4:00 pm", value: viewReport.reportSlot3 },
                  { label: "4:00 pm - 7:00 pm", value: viewReport.reportSlot4 },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-background border rounded-lg">
                    <span className="text-xs font-semibold text-primary block mb-1">{label}</span>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                      {value || <span className="text-muted-foreground italic">No entry provided</span>}
                    </p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-muted/30 border rounded-lg">
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5 mb-1"><PhoneCall className="h-3.5 w-3.5" />Call Timing with Director</span>
                  <span className="text-sm font-medium">{viewReport.directorCallTiming || "None recorded"}</span>
                </div>
                <div className="p-3 bg-muted/30 border rounded-lg">
                  <span className="text-xs font-semibold text-blue-600 flex items-center gap-1.5 mb-1"><Users className="h-3.5 w-3.5" />Internal Office Meeting</span>
                  <span className="text-sm font-medium">{viewReport.internalMeeting || "None recorded"}</span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
