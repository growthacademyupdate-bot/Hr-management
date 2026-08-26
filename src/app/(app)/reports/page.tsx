"use client";

import { useState, useMemo } from "react";
import { useAuth, useDB } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "../dashboard/page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
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

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <CardTitle>HR Audit Log</CardTitle>
        <div className="relative w-full sm:w-64">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search audit log..." className="pl-9 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No HR activity records found.</TableCell></TableRow>
            ) : paginatedData.map((act) => (
              <TableRow key={act.id}>
                <TableCell className="whitespace-nowrap">{new Date(act.time).toLocaleString()}</TableCell>
                <TableCell className="font-medium">{act.hrName}</TableCell>
                <TableCell><Badge variant="outline">{act.type.replace("_", " ")}</Badge></TableCell>
                <TableCell>{act.label}</TableCell>
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

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <CardTitle>{isEmployee ? "My Performance Metrics" : "Employee Performance"}</CardTitle>
        <div className="relative w-full sm:w-64">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search performance..." className="pl-9 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No performance data found.</TableCell></TableRow>
            ) : paginatedData.map((p) => (
              <TableRow key={p.id}>
                {!isEmployee && <TableCell className="font-medium">{p.empName}</TableCell>}
                <TableCell>{p.totalTasks}</TableCell>
                <TableCell>{p.completed}</TableCell>
                <TableCell>{p.rate}%</TableCell>
                <TableCell>
                  <Badge variant={p.avgRating === "N/A" ? "secondary" : "default"}>{p.avgRating}</Badge>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No task records found.</TableCell></TableRow>
            ) : paginatedData.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.title}</TableCell>
                {!isEmployee && <TableCell>{t.empName}</TableCell>}
                <TableCell><StatusBadge status={t.status} /></TableCell>
                <TableCell>{t.hrRating || "—"}</TableCell>
                <TableCell className="max-w-[200px] truncate">{t.hrReview || "—"}</TableCell>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No leave records found.</TableCell></TableRow>
            ) : paginatedData.map((l) => (
              <TableRow key={l.id}>
                {!isEmployee && <TableCell className="font-medium">{l.empName}</TableCell>}
                <TableCell>{l.type}</TableCell>
                <TableCell>{new Date(l.startDate).toLocaleDateString()} to {new Date(l.endDate).toLocaleDateString()}</TableCell>
                <TableCell><StatusBadge status={l.status} /></TableCell>
                {isAdmin && <TableCell className="max-w-[150px] truncate">{l.hrReviewComment || "—"}</TableCell>}
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

  const data = useMemo(() => {
    const deptMap: Record<string, { count: number; total: number; employees: any[] }> = {};
    db.employees.forEach((emp) => {
      if (!deptMap[emp.department]) deptMap[emp.department] = { count: 0, total: 0, employees: [] };
      deptMap[emp.department].count++;
      deptMap[emp.department].total += emp.salary || 0;
      deptMap[emp.department].employees.push(emp);
    });

    return Object.entries(deptMap).map(([dept, d]) => ({
      dept,
      count: d.count,
      total: d.total,
      avg: d.count ? Math.round(d.total / d.count) : 0,
      highest: Math.max(...d.employees.map((e) => e.salary || 0)),
    }));
  }, [db.employees]);

  const { search, setSearch, sortField, sortOrder, toggleSort, page, setPage, pageSize, setPageSize, totalPages, totalItems, startIndex, endIndex, paginatedData } = useDataTable({
    data,
    searchFields: (d) => [d.dept],
    defaultSortField: "total",
    defaultSortOrder: "desc",
  });

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle>Salary Report — Department Breakdown</CardTitle>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-48 sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search department..." className="pl-9 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" onClick={onExportCSV}>
            ⬇ Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-b">
          <div className="p-4 rounded-lg bg-muted/40 border">
            <div className="text-sm text-muted-foreground">Total Employees</div>
            <div className="text-2xl font-bold mt-1">{db.employees.length}</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/40 border">
            <div className="text-sm text-muted-foreground">Total Monthly Payroll</div>
            <div className="text-2xl font-bold mt-1">₹{db.employees.reduce((s, e) => s + (e.salary || 0), 0).toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/40 border">
            <div className="text-sm text-muted-foreground">Avg. Salary</div>
            <div className="text-2xl font-bold mt-1">₹{db.employees.length ? Math.round(db.employees.reduce((s, e) => s + (e.salary || 0), 0) / db.employees.length).toLocaleString() : 0}</div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="dept" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Department</SortableHeader>
              <SortableHeader field="count" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Employees</SortableHeader>
              <SortableHeader field="total" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Total Payroll</SortableHeader>
              <SortableHeader field="avg" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Avg. Salary</SortableHeader>
              <SortableHeader field="highest" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Highest Salary</SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No salary data found.</TableCell></TableRow>
            ) : paginatedData.map((d) => (
              <TableRow key={d.dept}>
                <TableCell className="font-medium">{d.dept}</TableCell>
                <TableCell>{d.count}</TableCell>
                <TableCell>₹{d.total.toLocaleString()}</TableCell>
                <TableCell>₹{d.avg.toLocaleString()}</TableCell>
                <TableCell>₹{d.highest.toLocaleString()}</TableCell>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No attendance export records found.</TableCell></TableRow>
            ) : paginatedData.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.empName}</TableCell>
                <TableCell>{a.date}</TableCell>
                <TableCell>{a.loginTime || "—"}</TableCell>
                <TableCell>{a.logoutTime || "—"}</TableCell>
                <TableCell>{a.workingHours}h</TableCell>
                <TableCell><StatusBadge status={a.status} /></TableCell>
                <TableCell>{a.productivity}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <DataTablePagination page={page} pageSize={pageSize} totalPages={totalPages} totalItems={totalItems} startIndex={startIndex} endIndex={endIndex} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </CardContent>
    </Card>
  );
}
