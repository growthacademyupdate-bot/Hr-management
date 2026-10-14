"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth, useDB } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTablePagination } from "@/components/DataTablePagination";
import {
  GraduationCap, Search, Eye, Calendar, Filter, X, Loader2, ArrowUpDown, FileText, CheckCircle2, Clock, User
} from "lucide-react";
import { getDailyTrainings } from "@/app/actions";
import { toast } from "sonner";

export default function DailyTrainingReportsPage() {
  const user = useAuth();
  const db = useDB();

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filters
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  // Selected report for Eye modal
  const [viewReport, setViewReport] = useState<any | null>(null);

  // Departments list for filter
  const departments = useMemo(() => {
    const list = new Set<string>();
    (db.employees || []).forEach((e) => {
      if (e.department) list.add(e.department);
    });
    return Array.from(list);
  }, [db.employees]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const res = await getDailyTrainings({
        role: user.role,
        employeeId: user.role === "employee" ? (user.employeeId || user.id) : undefined,
        search,
        date: dateFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        department: departmentFilter,
        page,
        pageSize,
      });

      if (res.success && res.records) {
        setRecords(res.records);
        setTotalItems(res.total || 0);
        setTotalPages(res.totalPages || 1);
      } else {
        toast.error(res.error || "Failed to load training reports");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network or server error while loading training reports");
    } finally {
      setLoading(false);
    }
  }, [user, search, dateFilter, startDate, endDate, departmentFilter, page, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClearFilters = () => {
    setSearch("");
    setDateFilter("");
    setStartDate("");
    setEndDate("");
    setDepartmentFilter("all");
    setPage(1);
  };

  const hasActiveFilters = search || dateFilter || startDate || endDate || departmentFilter !== "all";

  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  if (!user) return null;

  // Authorization check: Admin and HR only
  if (user.role !== "admin" && user.role !== "hr") {
    return (
      <div className="p-8 text-center space-y-3">
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-sm text-muted-foreground">Only Admin and HR personnel can access training reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 grid place-items-center text-primary">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Daily Training Reports</h1>
              <p className="text-sm text-muted-foreground">
                Review date-wise training points and skill development submissions from Sales employees.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="border shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            {/* Search (5 cols) */}
            <div className="sm:col-span-2 lg:col-span-4 space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Search</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID or designation..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 text-xs h-9 bg-background"
                />
              </div>
            </div>

            {/* Exact Date (3 cols) */}
            <div className="sm:col-span-1 lg:col-span-3 space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Training Date</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setStartDate("");
                  setEndDate("");
                  setPage(1);
                }}
                className="text-xs h-9 bg-background"
              />
            </div>

            {/* Department Filter (4 cols) */}
            <div className="sm:col-span-1 lg:col-span-3 space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Department</label>
              <Select
                value={departmentFilter}
                onValueChange={(val) => {
                  setDepartmentFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="text-xs h-9 bg-background w-full">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear / Reset (2 cols) */}
            <div className="sm:col-span-2 lg:col-span-2 flex items-end">
              {hasActiveFilters ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="w-full h-9 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5 mr-1.5" /> Clear Filters
                </Button>
              ) : (
                <div className="h-9 hidden lg:block" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card className="border shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-16">Sr. No.</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Training Date</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-20">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                      <p className="text-xs text-muted-foreground">Loading training records...</p>
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                      <div className="max-w-sm mx-auto space-y-2">
                        <GraduationCap className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                        <p className="font-semibold text-sm">No training reports found</p>
                        <p className="text-xs">
                          {hasActiveFilters
                            ? "Try adjusting your search query or date range filters."
                            : "No Sales employee training reports have been submitted yet."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((r, idx) => {
                    const srNo = startIndex + idx + 1;
                    const formattedSubmitted = r.submittedAt
                      ? new Date(r.submittedAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })
                      : "—";

                    return (
                      <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono text-xs text-muted-foreground">{srNo}</TableCell>
                        <TableCell className="font-mono text-xs font-semibold">{r.employeeId}</TableCell>
                        <TableCell className="text-xs font-medium">{r.employeeName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.designation || "Sales"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.department || "Sales"}</TableCell>
                        <TableCell className="text-xs font-medium whitespace-nowrap">{r.trainingDate}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formattedSubmitted}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            {r.status || "Submitted"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewReport(r)}
                            title="View Training Points"
                            className="hover:text-primary"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
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

      {/* EYE ICON PREVIEW MODAL */}
      {viewReport && (
        <Dialog open={!!viewReport} onOpenChange={(open) => !open && setViewReport(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6 sm:p-7">
            <DialogHeader className="border-b pb-4">
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" /> Daily Training Report
                </DialogTitle>
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  {viewReport.status || "Submitted"}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Employee training details submitted for date: <strong className="text-foreground">{viewReport.trainingDate}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-3">
              {/* Employee & Meta Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-muted/40 rounded-xl border text-xs">
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-0.5">Employee Name</span>
                  <span className="font-semibold text-foreground">{viewReport.employeeName}</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-0.5">Employee ID</span>
                  <span className="font-mono font-semibold text-foreground">{viewReport.employeeId}</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-0.5">Designation</span>
                  <span className="font-medium text-foreground">{viewReport.designation || "Sales"}</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-0.5">Department</span>
                  <span className="font-medium text-foreground">{viewReport.department || "Sales"}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-card border rounded-lg flex items-center gap-2.5">
                  <Calendar className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Training Date</span>
                    <span className="font-semibold text-foreground">{viewReport.trainingDate}</span>
                  </div>
                </div>

                <div className="p-3 bg-card border rounded-lg flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Submission Timestamp</span>
                    <span className="font-semibold text-foreground">
                      {new Date(viewReport.submittedAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Numbered Training Points */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Submitted Training Points
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    Total: {viewReport.trainingPoints?.length || 0} points
                  </span>
                </div>

                <div className="space-y-2.5">
                  {viewReport.trainingPoints && viewReport.trainingPoints.length > 0 ? (
                    viewReport.trainingPoints.map((pt: string, idx: number) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-background border rounded-xl flex items-start gap-3 shadow-xs"
                      >
                        <span className="h-5 w-5 rounded-full bg-primary/10 text-primary font-bold text-xs grid place-items-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                          {pt}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No training points recorded.</p>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
