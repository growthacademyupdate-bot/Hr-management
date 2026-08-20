"use client";

import { useState } from "react";
import { useAuth, useDB } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
      </div>
    </div>
  );
}
