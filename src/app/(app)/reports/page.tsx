"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth, useDB, api, useGlobalSearch } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "../dashboard/page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/useDataTable";
import { SortableHeader } from "@/components/SortableHeader";
import { DataTablePagination } from "@/components/DataTablePagination";

export default function ReportsPage() {
  const user = useAuth();
  const db = useDB();
  const [activeTab, setActiveTab] = useState("performance");
  const [dateFilter, setDateFilter] = useState("all");

  if (!user) return null;

  const isAdmin = user.role === "admin";
  const isHR = user.role === "hr";
  const isEmployee = user.role === "employee";

  // CSV Export helper
  const exportCSV = (rows: string[][], filename: string) => {
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  // Filter Date Helper
  const filterByDate = (dateString: string) => {
    if (dateFilter === "all") return true;
    const date = new Date(dateString);
    const today = new Date();
    if (dateFilter === "today") return date.toDateString() === today.toDateString();
    if (dateFilter === "this_week") {
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      return date >= weekAgo;
    }
    if (dateFilter === "this_month") return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    return true;
  };

  const handleExportSalaryCSV = () => {
    const header = ["Employee ID", "Name", "Department", "Designation", "Salary", "Status"];
    const rows = db.employees.map(e => [e.id, e.name, e.department, e.designation, String(e.salary || 0), e.status]);
    exportCSV([header, ...rows], "salary_report.csv");
  };

  const handleExportAttendanceCSV = () => {
    const header = ["Employee", "Date", "Login", "Logout", "Hours", "Status", "Productivity"];
    const rows = db.attendance.filter(a => filterByDate(a.date)).map(a => {
      const emp = db.employees.find(e => e.id === a.employeeId);
      return [
        emp?.name || a.employeeId, a.date,
        a.loginTime || "—", a.logoutTime || "—",
        String(a.workingHours), a.status, `${a.productivity}%`
      ];
    });
    exportCSV([header, ...rows], "attendance_report.csv");
  };

  // Company Summary Data
  const getSummaryData = () => {
    const totalEmployees = db.employees.length;
    const activeEmployees = db.employees.filter(e => e.status === "Active").length;
    const todayAtt = db.attendance.filter(a => filterByDate(a.date));
    const tasks = db.tasks.filter(t => filterByDate(t.createdAt));
    const leaves = db.leaves.filter(l => filterByDate(l.appliedAt));
    
    return {
      employees: { total: totalEmployees, active: activeEmployees },
      attendance: { present: todayAtt.filter(a => a.status === "Present").length, working: todayAtt.filter(a => a.sessions?.some(s => !s.logoutAt)).length },
      leaves: { pending: leaves.filter(l => l.status === "pending").length, approved: leaves.filter(l => l.status === "admin_approved").length },
      tasks: { total: tasks.length, completed: tasks.filter(t => t.status === "completed" || t.status === "reviewed").length }
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          title="Reports Module" 
          description="View analytics and centralized data reports." 
        />
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[180px] bg-card">
            <SelectValue placeholder="Filter by Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 border-b">
        {isAdmin && (
          <>
            <button onClick={() => setActiveTab("summary")} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === "summary" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Company Summary</button>
            <button onClick={() => setActiveTab("hr-activity")} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === "hr-activity" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>HR Activity</button>
            <button onClick={() => setActiveTab("salary")} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === "salary" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Salary Report</button>
          </>
        )}
        <button onClick={() => setActiveTab("performance")} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === "performance" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          {isEmployee ? "My Performance" : "Employee Performance"}
        </button>
        <button onClick={() => setActiveTab("tasks")} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === "tasks" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          {isEmployee ? "My Tasks" : "Task Reports"}
        </button>
        <button onClick={() => setActiveTab("leaves")} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === "leaves" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          {isEmployee ? "My Leaves" : "Leave Reports"}
        </button>
        {(isAdmin || isHR) && (
          <button onClick={() => setActiveTab("attendance-export")} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === "attendance-export" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Attendance Export</button>
        )}
      </div>

      <div className="pt-4">
        {/* COMPANY SUMMARY TAB */}
        {activeTab === "summary" && isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(getSummaryData()).map(([category, stats]) => (
              <Card key={category} className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium uppercase text-muted-foreground">{category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats).map(([label, val]) => (
                      <div key={label} className="flex justify-between items-center text-sm">
                        <span className="capitalize">{label.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="font-semibold">{val}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* HR ACTIVITY TAB */}
        {activeTab === "hr-activity" && isAdmin && (
          <HrActivityReport filterByDate={filterByDate} />
        )}

        {/* PERFORMANCE TAB */}
        {activeTab === "performance" && (
          <PerformanceReport filterByDate={filterByDate} isEmployee={isEmployee} isAdmin={isAdmin} isHR={isHR} />
        )}

        {/* TASKS TAB */}
        {activeTab === "tasks" && (
          <TasksReport filterByDate={filterByDate} isEmployee={isEmployee} />
        )}

        {/* LEAVES TAB */}
        {activeTab === "leaves" && (
          <LeavesReport filterByDate={filterByDate} isEmployee={isEmployee} isAdmin={isAdmin} />
        )}

        {/* SALARY REPORT TAB */}
        {activeTab === "salary" && isAdmin && (
          <SalaryReport onExportCSV={handleExportSalaryCSV} />
        )}

        {/* ATTENDANCE EXPORT TAB */}
        {activeTab === "attendance-export" && (isAdmin || isHR) && (
          <AttendanceExportReport filterByDate={filterByDate} onExportCSV={handleExportAttendanceCSV} />
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// SUBCOMPONENTS WITH LISTING, SEARCH, SORT, PAGINATION
// ----------------------------------------------------

function HrActivityReport({ filterByDate }: { filterByDate: (d: string) => boolean }) {
  const db = useDB();
  const user = useAuth();
  const globalSearch = useGlobalSearch();

  const data = useMemo(() => {
    return db.activities
      .filter((a) => ["leave_review", "task_review"].includes(a.type) && filterByDate(a.time))
      .map((act) => ({
        ...act,
        hrName: db.employees.find((e) => e.id === act.employeeId)?.name || "HR User",
      }));
  }, [db.activities, db.employees, filterByDate]);

  const { search, setSearch, sortField, sortOrder, toggleSort, page, setPage, pageSize, setPageSize, totalPages, totalItems, startIndex, endIndex, paginatedData } = useDataTable({
    data,
    searchFields: (a) => [a.hrName, a.type, a.label],
    defaultSortField: "time",
    defaultSortOrder: "desc",
  });

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm("Are you sure you want to delete this activity record? This action cannot be undone.")) return;
    try {
      await api.deleteActivity(activityId);
      toast.success("Activity deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete activity");
    }
  };

  useEffect(() => {
    setSearch(globalSearch);
  }, [globalSearch, setSearch]);

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <CardTitle>HR Audit Log</CardTitle>
        <div className="relative w-full sm:w-64">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search audit log..." 
            className="pl-9 text-xs" 
            value={search} 
            onChange={(e) => {
              setSearch(e.target.value);
              api.setGlobalSearch(e.target.value);
            }} 
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="time" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Date</SortableHeader>
              <SortableHeader field="hrName" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>HR User</SortableHeader>
              <SortableHeader field="type" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Type</SortableHeader>
              <SortableHeader field="label" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Details</SortableHeader>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No HR activity records found.</TableCell></TableRow>
            ) : paginatedData.map((act) => (
              <TableRow key={act.id}>
                <TableCell className="whitespace-nowrap">{new Date(act.time).toLocaleString()}</TableCell>
                <TableCell className="font-medium">{act.hrName}</TableCell>
                <TableCell><Badge variant="outline">{act.type.replace("_", " ")}</Badge></TableCell>
                <TableCell>{act.label}</TableCell>
                <TableCell>
                  {user?.role === "admin" && (
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteActivity(act.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <DataTablePagination page={page} pageSize={pageSize} totalPages={totalPages} totalItems={totalItems} startIndex={startIndex} endIndex={endIndex} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </CardContent>
    </Card>
  );
}

function PerformanceReport({ filterByDate, isEmployee, isAdmin, isHR }: any) {
  const db = useDB();
  const user = useAuth();
  const globalSearch = useGlobalSearch();

  const data = useMemo(() => {
    let emps = isAdmin || isHR ? db.employees : db.employees.filter((e) => e.id === (user?.employeeId || user?.id));
    return emps.map((emp) => {
      const myTasks = db.tasks.filter((t) => t.assignedTo === emp.id && filterByDate(t.createdAt));
      const completed = myTasks.filter((t) => t.status === "completed" || t.status === "reviewed").length;
      let totalRating = 0;
      let ratedCount = 0;
      myTasks.forEach((t) => {
        if (t.hrRating) {
          const val = parseInt(t.hrRating.split("/")[0]) || 0;
          if (val > 0) { totalRating += val; ratedCount++; }
        }
      });
      return {
        id: emp.id,
        empName: emp.name,
        totalTasks: myTasks.length,
        completed,
        rate: myTasks.length ? Math.round((completed / myTasks.length) * 100) : 0,
        avgRating: ratedCount ? (totalRating / ratedCount).toFixed(1) : "N/A",
        numericRating: ratedCount ? totalRating / ratedCount : 0,
      };
    });
  }, [db.employees, db.tasks, user, isAdmin, isHR, filterByDate]);

  const { search, setSearch, sortField, sortOrder, toggleSort, page, setPage, pageSize, setPageSize, totalPages, totalItems, startIndex, endIndex, paginatedData } = useDataTable({
    data,
    searchFields: (p) => [p.empName, String(p.totalTasks), String(p.completed)],
    defaultSortField: "empName",
    defaultSortOrder: "asc",
  });

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm("Are you sure you want to delete this employee? This will also delete all their associated data. This action cannot be undone.")) return;
    try {
      await api.deleteEmployee(employeeId);
      toast.success("Employee deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete employee");
    }
  };

  useEffect(() => {
    setSearch(globalSearch);
  }, [globalSearch, setSearch]);

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <CardTitle>{isEmployee ? "My Performance Metrics" : "Employee Performance"}</CardTitle>
        <div className="relative w-full sm:w-64">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search performance..." 
            className="pl-9 text-xs" 
            value={search} 
            onChange={(e) => {
              setSearch(e.target.value);
              api.setGlobalSearch(e.target.value);
            }} 
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {!isEmployee && <SortableHeader field="empName" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Employee</SortableHeader>}
              <SortableHeader field="totalTasks" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Assigned Tasks</SortableHeader>
              <SortableHeader field="completed" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Completed</SortableHeader>
              <SortableHeader field="rate" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Completion Rate</SortableHeader>
              <SortableHeader field="numericRating" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Avg HR Rating</SortableHeader>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow><TableCell colSpan={isAdmin || isHR ? 6 : 5} className="text-center py-8 text-muted-foreground">No performance data found.</TableCell></TableRow>
            ) : paginatedData.map((p) => (
              <TableRow key={p.id}>
                {!isEmployee && <TableCell className="font-medium">{p.empName}</TableCell>}
                <TableCell>{p.totalTasks}</TableCell>
                <TableCell>{p.completed}</TableCell>
                <TableCell>{p.rate}%</TableCell>
                <TableCell>
                  <Badge variant={p.avgRating === "N/A" ? "secondary" : "default"}>{p.avgRating}</Badge>
                </TableCell>
                <TableCell>
                  {(isAdmin || isHR) && (
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteEmployee(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <DataTablePagination page={page} pageSize={pageSize} totalPages={totalPages} totalItems={totalItems} startIndex={startIndex} endIndex={endIndex} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </CardContent>
    </Card>
  );
}

function TasksReport({ filterByDate, isEmployee }: any) {
  const db = useDB();
  const user = useAuth();

  const data = useMemo(() => {
    return db.tasks
      .filter((t) => (isEmployee ? t.assignedTo === (user?.employeeId || user?.id) : true) && filterByDate(t.createdAt))
      .map((t) => ({
        ...t,
        empName: db.employees.find((e) => e.id === t.assignedTo)?.name || "Unknown",
      }));
  }, [db.tasks, db.employees, user, isEmployee, filterByDate]);

  const { search, setSearch, sortField, sortOrder, toggleSort, page, setPage, pageSize, setPageSize, totalPages, totalItems, startIndex, endIndex, paginatedData } = useDataTable({
    data,
    searchFields: (t) => [t.title, t.empName, t.status, t.hrRating, t.hrReview],
    defaultSortField: "title",
    defaultSortOrder: "asc",
  });

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task? This action cannot be undone.")) return;
    try {
      await api.deleteTask(taskId);
      toast.success("Task deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete task");
    }
  };

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <CardTitle>{isEmployee ? "My Tasks" : "Task Reports"}</CardTitle>
        <div className="relative w-full sm:w-64">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search task report..." className="pl-9 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="title" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Task</SortableHeader>
              {!isEmployee && <SortableHeader field="empName" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Assigned To</SortableHeader>}
              <SortableHeader field="status" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Status</SortableHeader>
              <SortableHeader field="hrRating" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>HR Rating</SortableHeader>
              <SortableHeader field="hrReview" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>HR Review</SortableHeader>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No task records found.</TableCell></TableRow>
            ) : paginatedData.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.title}</TableCell>
                {!isEmployee && <TableCell>{t.empName}</TableCell>}
                <TableCell><StatusBadge status={t.status} /></TableCell>
                <TableCell>{t.hrRating || "—"}</TableCell>
                <TableCell className="max-w-[200px] truncate">{t.hrReview || "—"}</TableCell>
                <TableCell>
                  {(user?.role === "admin" || user?.role === "hr" || (isEmployee && t.assignedTo === (user?.employeeId || user?.id))) && (
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTask(t.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <DataTablePagination page={page} pageSize={pageSize} totalPages={totalPages} totalItems={totalItems} startIndex={startIndex} endIndex={endIndex} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </CardContent>
    </Card>
  );
}

function LeavesReport({ filterByDate, isEmployee, isAdmin }: any) {
  const db = useDB();
  const user = useAuth();

  const data = useMemo(() => {
    return db.leaves
      .filter((l) => (isEmployee ? l.employeeId === (user?.employeeId || user?.id) : true) && filterByDate(l.appliedAt))
      .map((l) => ({
        ...l,
        empName: db.employees.find((e) => e.id === l.employeeId)?.name || "Unknown",
      }));
  }, [db.leaves, db.employees, user, isEmployee, filterByDate]);

  const { search, setSearch, sortField, sortOrder, toggleSort, page, setPage, pageSize, setPageSize, totalPages, totalItems, startIndex, endIndex, paginatedData } = useDataTable({
    data,
    searchFields: (l) => [l.empName, l.type, l.status, l.startDate, l.endDate, l.hrReviewComment],
    defaultSortField: "startDate",
    defaultSortOrder: "desc",
  });

  const handleDeleteLeave = async (leaveId: string) => {
    if (!confirm("Are you sure you want to delete this leave record? This action cannot be undone.")) return;
    try {
      await api.deleteLeave(leaveId);
      toast.success("Leave deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete leave");
    }
  };

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <CardTitle>{isEmployee ? "My Leaves" : "Leave Reports"}</CardTitle>
        <div className="relative w-full sm:w-64">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search leave report..." className="pl-9 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {!isEmployee && <SortableHeader field="empName" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Employee</SortableHeader>}
              <SortableHeader field="type" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Type</SortableHeader>
              <SortableHeader field="startDate" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Dates</SortableHeader>
              <SortableHeader field="status" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Final Status</SortableHeader>
              {isAdmin && <SortableHeader field="hrReviewComment" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>HR Comment</SortableHeader>}
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow><TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground">No leave records found.</TableCell></TableRow>
            ) : paginatedData.map((l) => (
              <TableRow key={l.id}>
                {!isEmployee && <TableCell className="font-medium">{l.empName}</TableCell>}
                <TableCell>{l.type}</TableCell>
                <TableCell>{new Date(l.startDate).toLocaleDateString()} to {new Date(l.endDate).toLocaleDateString()}</TableCell>
                <TableCell><StatusBadge status={l.status} /></TableCell>
                {isAdmin && <TableCell className="max-w-[150px] truncate">{l.hrReviewComment || "—"}</TableCell>}
                <TableCell>
                  {(user?.role === "admin" || user?.role === "hr" || (isEmployee && l.employeeId === (user?.employeeId || user?.id))) && (
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteLeave(l.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <DataTablePagination page={page} pageSize={pageSize} totalPages={totalPages} totalItems={totalItems} startIndex={startIndex} endIndex={endIndex} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </CardContent>
    </Card>
  );
}

function SalaryReport({ onExportCSV }: { onExportCSV: () => void }) {
  const db = useDB();
  const user = useAuth();

  const employeeSalaryDetails = useMemo(() => {
    return db.employees.map((emp) => {
      const approvedExpenses = db.expenses
        .filter((exp) => exp.employeeId === emp.id && (exp.status === "admin_approved" || exp.status === "hr_approved"))
        .reduce((sum, exp) => sum + exp.amount, 0);

      const reimbursedExpenses = db.expenses
        .filter((exp) => exp.employeeId === emp.id && exp.status === "reimbursed")
        .reduce((sum, exp) => sum + exp.amount, 0);

      return {
        ...emp,
        approvedExpenses,
        reimbursedExpenses,
        totalSalaryPayout: (emp.salary || 0) + approvedExpenses,
      };
    });
  }, [db.employees, db.expenses]);

  const totalBasePayroll = useMemo(() => db.employees.reduce((s, e) => s + (e.salary || 0), 0), [db.employees]);
  const totalApprovedExpenses = useMemo(() => {
    return db.expenses
      .filter((exp) => exp.status === "admin_approved" || exp.status === "hr_approved")
      .reduce((s, e) => s + e.amount, 0);
  }, [db.expenses]);

  const { search, setSearch, sortField, sortOrder, toggleSort, page, setPage, pageSize, setPageSize, totalPages, totalItems, startIndex, endIndex, paginatedData } = useDataTable({
    data: employeeSalaryDetails,
    searchFields: (e) => [e.id, e.name, e.department, e.designation],
    defaultSortField: "totalSalaryPayout",
    defaultSortOrder: "desc",
  });

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle>Salary & Expense Reimbursement Report</CardTitle>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-48 sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search employee, dept..." className="pl-9 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" onClick={onExportCSV}>
            ⬇ Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 border-b">
          <div className="p-4 rounded-lg bg-muted/40 border">
            <div className="text-sm text-muted-foreground">Total Employees</div>
            <div className="text-2xl font-bold mt-1">{db.employees.length}</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/40 border">
            <div className="text-sm text-muted-foreground">Base Monthly Payroll</div>
            <div className="text-2xl font-bold mt-1">₹{totalBasePayroll.toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="text-sm text-amber-700 font-medium">Pending Expense Payouts</div>
            <div className="text-2xl font-bold text-amber-900 mt-1">₹{totalApprovedExpenses.toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-sm text-emerald-700 font-medium">Net Salary Day Total</div>
            <div className="text-2xl font-bold text-emerald-900 mt-1">₹{(totalBasePayroll + totalApprovedExpenses).toLocaleString()}</div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="id" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Emp ID</SortableHeader>
              <SortableHeader field="name" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Employee Name</SortableHeader>
              <SortableHeader field="department" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Department</SortableHeader>
              <SortableHeader field="salary" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Base Salary (₹)</SortableHeader>
              <SortableHeader field="approvedExpenses" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Approved Reimbursements (₹)</SortableHeader>
              <SortableHeader field="totalSalaryPayout" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Total Salary Day Payout (₹)</SortableHeader>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No employee salary records found.</TableCell></TableRow>
            ) : paginatedData.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell className="font-mono text-xs font-semibold">{emp.id}</TableCell>
                <TableCell className="font-medium">{emp.name}</TableCell>
                <TableCell>{emp.department}</TableCell>
                <TableCell>₹{(emp.salary || 0).toLocaleString()}</TableCell>
                <TableCell className="text-amber-600 font-medium">
                  {emp.approvedExpenses > 0 ? `+₹${emp.approvedExpenses.toLocaleString()}` : "—"}
                </TableCell>
                <TableCell className="font-bold text-emerald-700">₹{emp.totalSalaryPayout.toLocaleString()}</TableCell>
                <TableCell>
                  {user?.role === "admin" && (
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={async () => {
                      if (confirm("Are you sure you want to delete this employee? This will also delete all their associated data. This action cannot be undone.")) {
                        try {
                          await api.deleteEmployee(emp.id);
                          toast.success("Employee deleted successfully");
                        } catch (error: any) {
                          toast.error(error.message || "Failed to delete employee");
                        }
                      }
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <DataTablePagination page={page} pageSize={pageSize} totalPages={totalPages} totalItems={totalItems} startIndex={startIndex} endIndex={endIndex} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </CardContent>
    </Card>
  );
}

function AttendanceExportReport({ filterByDate, onExportCSV }: any) {
  const db = useDB();
  const user = useAuth();

  const data = useMemo(() => {
    return db.attendance
      .filter((a) => filterByDate(a.date))
      .map((a) => ({
        ...a,
        empName: db.employees.find((e) => e.id === a.employeeId)?.name || a.employeeId,
      }));
  }, [db.attendance, db.employees, filterByDate]);

  const { search, setSearch, sortField, sortOrder, toggleSort, page, setPage, pageSize, setPageSize, totalPages, totalItems, startIndex, endIndex, paginatedData } = useDataTable({
    data,
    searchFields: (a) => [a.empName, a.date, a.status, a.loginTime, a.logoutTime],
    defaultSortField: "date",
    defaultSortOrder: "desc",
  });

  const handleDeleteAttendance = async (attendanceId: string) => {
    if (!confirm("Are you sure you want to delete this attendance record? This action cannot be undone.")) return;
    try {
      await api.deleteAttendance(attendanceId);
      toast.success("Attendance record deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete attendance record");
    }
  };

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <CardTitle>Attendance Export</CardTitle>
        <div className="flex items-center gap-3">
          <div className="relative w-48 sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search export..." className="pl-9 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" onClick={onExportCSV}>
            ⬇ Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="empName" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Employee</SortableHeader>
              <SortableHeader field="date" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Date</SortableHeader>
              <SortableHeader field="loginTime" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Login</SortableHeader>
              <SortableHeader field="logoutTime" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Logout</SortableHeader>
              <SortableHeader field="workingHours" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Hours</SortableHeader>
              <SortableHeader field="status" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Status</SortableHeader>
              <SortableHeader field="productivity" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Productivity</SortableHeader>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No attendance export records found.</TableCell></TableRow>
            ) : paginatedData.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.empName}</TableCell>
                <TableCell>{a.date}</TableCell>
                <TableCell>{a.loginTime || "—"}</TableCell>
                <TableCell>{a.logoutTime || "—"}</TableCell>
                <TableCell>{a.workingHours}h</TableCell>
                <TableCell><StatusBadge status={a.status} /></TableCell>
                <TableCell>{a.productivity}%</TableCell>
                <TableCell>
                  {(user?.role === "admin" || user?.role === "hr") && (
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteAttendance(a.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <DataTablePagination page={page} pageSize={pageSize} totalPages={totalPages} totalItems={totalItems} startIndex={startIndex} endIndex={endIndex} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </CardContent>
    </Card>
  );
}
