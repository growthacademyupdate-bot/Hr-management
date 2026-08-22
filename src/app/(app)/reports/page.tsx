"use client";

import { useState } from "react";
import { useAuth, useDB } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "../dashboard/page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  // Salary Report Data
  const getSalaryData = () => {
    const deptMap: Record<string, { count: number; total: number; employees: any[] }> = {};
    db.employees.forEach(emp => {
      if (!deptMap[emp.department]) deptMap[emp.department] = { count: 0, total: 0, employees: [] };
      deptMap[emp.department].count++;
      deptMap[emp.department].total += emp.salary || 0;
      deptMap[emp.department].employees.push(emp);
    });
    return Object.entries(deptMap).map(([dept, d]) => ({
      dept, count: d.count, total: d.total, avg: d.count ? Math.round(d.total / d.count) : 0, employees: d.employees
    })).sort((a, b) => b.total - a.total);
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

  // Performance Data
  const getPerformanceData = () => {
    let emps = isAdmin || isHR ? db.employees : db.employees.filter(e => e.id === (user.employeeId || user.id));
    return emps.map(emp => {
      const myTasks = db.tasks.filter(t => t.assignedTo === emp.id && filterByDate(t.createdAt));
      const completed = myTasks.filter(t => t.status === "completed" || t.status === "reviewed").length;
      let totalRating = 0; let ratedCount = 0;
      myTasks.forEach(t => {
        if (t.hrRating) {
          const val = parseInt(t.hrRating.split("/")[0]) || 0;
          if (val > 0) { totalRating += val; ratedCount++; }
        }
      });
      return {
        emp,
        totalTasks: myTasks.length,
        completed,
        rate: myTasks.length ? Math.round((completed / myTasks.length) * 100) : 0,
        avgRating: ratedCount ? (totalRating / ratedCount).toFixed(1) : "N/A"
      };
    });
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
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle>HR Audit Log</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>HR User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {db.activities.filter(a => ["leave_review", "task_review"].includes(a.type) && filterByDate(a.time)).map(act => (
                    <TableRow key={act.id}>
                      <TableCell className="whitespace-nowrap">{new Date(act.time).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{db.employees.find(e => e.id === act.employeeId)?.name || "HR User"}</TableCell>
                      <TableCell><Badge variant="outline">{act.type.replace("_", " ")}</Badge></TableCell>
                      <TableCell>{act.label}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* PERFORMANCE TAB */}
        {activeTab === "performance" && (
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle>{isEmployee ? "My Performance Metrics" : "Employee Performance"}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    {!isEmployee && <TableHead>Employee</TableHead>}
                    <TableHead>Assigned Tasks</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Completion Rate</TableHead>
                    <TableHead>Avg HR Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getPerformanceData().map(p => (
                    <TableRow key={p.emp.id}>
                      {!isEmployee && <TableCell className="font-medium">{p.emp.name}</TableCell>}
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
            </CardContent>
          </Card>
        )}

        {/* TASKS TAB */}
        {activeTab === "tasks" && (
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle>{isEmployee ? "My Tasks" : "Task Reports"}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    {!isEmployee && <TableHead>Assigned To</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead>HR Rating</TableHead>
                    <TableHead>HR Review</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {db.tasks.filter(t => (isEmployee ? t.assignedTo === (user.employeeId || user.id) : true) && filterByDate(t.createdAt)).map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.title}</TableCell>
                      {!isEmployee && <TableCell>{db.employees.find(e => e.id === t.assignedTo)?.name}</TableCell>}
                      <TableCell><StatusBadge status={t.status} /></TableCell>
                      <TableCell>{t.hrRating || "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{t.hrReview || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* LEAVES TAB */}
        {activeTab === "leaves" && (
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle>{isEmployee ? "My Leaves" : "Leave Reports"}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    {!isEmployee && <TableHead>Employee</TableHead>}
                    <TableHead>Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Final Status</TableHead>
                    {isAdmin && <TableHead>HR Comment</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {db.leaves.filter(l => (isEmployee ? l.employeeId === (user.employeeId || user.id) : true) && filterByDate(l.appliedAt)).map(l => (
                    <TableRow key={l.id}>
                      {!isEmployee && <TableCell className="font-medium">{db.employees.find(e => e.id === l.employeeId)?.name}</TableCell>}
                      <TableCell>{l.type}</TableCell>
                      <TableCell>{new Date(l.startDate).toLocaleDateString()} to {new Date(l.endDate).toLocaleDateString()}</TableCell>
                      <TableCell><StatusBadge status={l.status} /></TableCell>
                      {isAdmin && <TableCell className="max-w-[150px] truncate">{l.hrReviewComment || "—"}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        {/* SALARY REPORT TAB */}
        {activeTab === "salary" && isAdmin && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Salary Report — Department Breakdown</CardTitle>
              <Button size="sm" variant="outline" onClick={handleExportSalaryCSV}>
                ⬇ Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                    <TableHead>Department</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Total Payroll</TableHead>
                    <TableHead>Avg. Salary</TableHead>
                    <TableHead>Highest Salary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSalaryData().map(d => (
                    <TableRow key={d.dept}>
                      <TableCell className="font-medium">{d.dept}</TableCell>
                      <TableCell>{d.count}</TableCell>
                      <TableCell>₹{d.total.toLocaleString()}</TableCell>
                      <TableCell>₹{d.avg.toLocaleString()}</TableCell>
                      <TableCell>₹{Math.max(...d.employees.map(e => e.salary || 0)).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ATTENDANCE EXPORT TAB */}
        {activeTab === "attendance-export" && (isAdmin || isHR) && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Attendance Export</CardTitle>
              <Button size="sm" variant="outline" onClick={handleExportAttendanceCSV}>
                ⬇ Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>Logout</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Productivity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {db.attendance.filter(a => filterByDate(a.date)).slice(0, 50).map(a => {
                    const emp = db.employees.find(e => e.id === a.employeeId);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{emp?.name || a.employeeId}</TableCell>
                        <TableCell>{a.date}</TableCell>
                        <TableCell>{a.loginTime || "—"}</TableCell>
                        <TableCell>{a.logoutTime || "—"}</TableCell>
                        <TableCell>{a.workingHours}h</TableCell>
                        <TableCell><StatusBadge status={a.status} /></TableCell>
                        <TableCell>{a.productivity}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
