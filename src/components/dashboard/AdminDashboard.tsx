"use client";

import { useMemo, useState } from "react";
import { useAuth, useDB, api } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Users, UserCheck, UserX, Clock, ListChecks, CheckCircle2, AlertTriangle, Receipt, FileText, CalendarDays, Bell, Plus, Calendar, Activity } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, Legend, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, EmployeeActivityTable } from "@/components/dashboard/SharedDashboardComponents";

export function AdminDashboard() {
  const user = useAuth();
  const db = useDB();
  if (!user) return null;

  if (db.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Company Dashboard" description="Loading data..." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const employeeIds = new Set(db.employees.map((e) => e.id));
  
  // KPI Calculations
  const activeEmployees = db.employees.filter((e) => e.status === "Active").length;
  
  const todayAtt = db.attendance.filter((a) => a.date === today && employeeIds.has(a.employeeId));
  const present = todayAtt.filter((a) => a.firstLoginAt || (a.sessions && a.sessions.length > 0) || ["Present", "Half Day", "Short Day", "Incomplete"].includes(a.status)).length;
  
  const onLeaveToday = db.leaves.filter((l) => l.status === "admin_approved" && l.startDate <= today && l.endDate >= today && employeeIds.has(l.employeeId)).length;
  
  const pendingLeaves = db.leaves.filter((l) => l.status === "hr_approved").length;
  
  const pendingTasks = db.tasks.filter((t) => t.status === "assigned" || t.status === "working_progress").length;
  const completedTasks = db.tasks.filter((t) => t.status === "completed" || t.status === "reviewed").length;
  const totalTasks = db.tasks.length;
  
  const pendingExpenses = db.expenses.filter((e) => e.status === "hr_approved").length;
  
  const attendanceIssues = todayAtt.filter((a) => a.status === "Late" || a.status === "Incomplete" || a.status === "Short Day").length;
  
  // Weekly Attendance Chart
  const weekly = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const date = d.toISOString().slice(0, 10);
    const day = d.toLocaleDateString(undefined, { weekday: "short" });
    const isHoliday = db.holidays?.some(h => h.isActive && h.holidayType === "COMPANY_HOLIDAY" && h.startDate <= date && h.endDate >= date);
    const recs = db.attendance.filter((a) => a.date === date && employeeIds.has(a.employeeId));
    const dayPresent = recs.filter((r) => r.firstLoginAt || (r.sessions && r.sessions.length > 0) || ["Present", "Half Day", "Short Day", "Incomplete"].includes(r.status)).length;
    const dayLeave = db.leaves.filter(l => l.status === "admin_approved" && l.startDate <= date && l.endDate >= date && employeeIds.has(l.employeeId)).length;
    const dayAbsent = isHoliday ? 0 : Math.max(db.employees.length - dayPresent - dayLeave, 0);
    return {
      day,
      Present: dayPresent,
      Absent: dayAbsent,
      Leave: dayLeave,
    };
  });

  // Department distribution
  const deptMap = new Map<string, number>();
  db.employees.forEach((e) => {
    const d = e.department || "Unassigned";
    deptMap.set(d, (deptMap.get(d) || 0) + 1);
  });
  const deptData = Array.from(deptMap.entries()).map(([name, value]) => ({ name, value }));
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

  // Leaves
  const leavesSummary = [
    { name: "Pending", value: db.leaves.filter(l => l.status === "pending" || l.status === "hr_approved").length },
    { name: "Approved", value: db.leaves.filter(l => l.status === "admin_approved").length },
    { name: "Rejected", value: db.leaves.filter(l => l.status === "admin_rejected" || l.status === "hr_rejected").length }
  ].filter(l => l.value > 0);

  // Recent Tasks
  const recentTasks = [...db.tasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  const currentDateFormatted = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Good Morning, ${user.name.split(" ")[0]}`} 
        description={currentDateFormatted} 
      />

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={activeEmployees} icon={Users} tone="primary" trend={`${db.employees.length} total registered`} />
        <StatCard label="Present Today" value={present} icon={UserCheck} tone="success" trend={`${Math.round((present / Math.max(activeEmployees, 1)) * 100)}% attendance`} />
        <StatCard label="On Leave Today" value={onLeaveToday} icon={UserX} tone="warning" trend="Approved leaves" />
        <StatCard label="Pending Leaves" value={pendingLeaves} icon={Clock} tone="warning" trend="Requires Admin approval" />
        <StatCard label="Pending Tasks" value={pendingTasks} icon={ListChecks} tone="info" trend={`${totalTasks > 0 ? Math.round((completedTasks/totalTasks)*100) : 0}% completion`} />
        <StatCard label="Pending Expenses" value={pendingExpenses} icon={Receipt} tone="warning" trend="Requires Admin approval" />
        <StatCard label="Attendance Issues" value={attendanceIssues} icon={AlertTriangle} tone="destructive" trend="Late/Incomplete" />
        <StatCard label="Pending Quotations" value={0} icon={FileText} tone="info" trend="No data" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ATTENDANCE CHART */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader><CardTitle>Attendance Overview</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekly}>
                <defs>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Legend />
                <Area type="monotone" dataKey="Present" stroke="var(--color-primary)" fill="url(#gP)" strokeWidth={2} />
                <Area type="monotone" dataKey="Absent" stroke="var(--color-destructive)" fill="var(--color-destructive)" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="Leave" stroke="var(--color-warning)" fill="var(--color-warning)" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* DEPARTMENT DISTRIBUTION */}
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle>Employee Distribution</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={deptData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                  {deptData.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* RECENT TASKS */}
        <Card className="border-0 shadow-sm overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTasks.map((t) => {
                  const emp = db.employees.find(e => e.id === t.assignedTo);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium text-sm">{t.title}</TableCell>
                      <TableCell>{emp?.name || t.assignedTo}</TableCell>
                      <TableCell><StatusBadge status={t.status} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* RECENT ACTIVITY */}
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle>Recent Activities</CardTitle></CardHeader>
          <CardContent>
            <ol className="relative border-l border-border ml-3 space-y-4 h-64 overflow-y-auto pr-2">
              {db.activities.length === 0 && <div className="text-sm text-muted-foreground">No recent activity.</div>}
              {db.activities.slice(0, 10).map((a) => (
                <li key={a.id} className="ml-4">
                  <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-primary mt-1.5" />
                  <div className="flex justify-between items-start">
                    <time className="text-xs text-muted-foreground">{new Date(a.time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: "2-digit", minute: "2-digit" })}</time>
                    {a.module && <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-muted px-1 rounded">{a.module}</span>}
                  </div>
                  <p className="text-sm font-medium mt-1">{a.label}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* EXPENSE OVERVIEW */}
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle>Expense Overview</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground text-sm">Pending HR</span>
                <span className="font-bold">₹{db.expenses.filter(e => e.status === "pending").reduce((a,b)=>a+b.amount,0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground text-sm">Pending Admin</span>
                <span className="font-bold text-warning">₹{db.expenses.filter(e => e.status === "hr_approved").reduce((a,b)=>a+b.amount,0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground text-sm">Approved (This Month)</span>
                <span className="font-bold text-success">₹{db.expenses.filter(e => e.status === "admin_approved" || e.status === "reimbursed").reduce((a,b)=>a+b.amount,0).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* HOLIDAY OVERVIEW */}
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle>Upcoming Holidays</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {db.holidays?.filter(h => h.isActive && h.startDate >= today).sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).slice(0, 4).map((h) => {
                const hDate = new Date(h.startDate);
                const diffTime = hDate.getTime() - new Date(today).getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return (
                  <div key={h.id} className="flex justify-between items-center bg-muted/30 p-2 rounded-lg border">
                    <div>
                      <div className="font-medium text-sm">{h.name}</div>
                      <div className="text-xs text-muted-foreground">{hDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{diffDays === 0 ? "Today" : diffDays === 1 ? "Tomorrow" : `${diffDays} days`}</Badge>
                  </div>
                );
              })}
              {!db.holidays?.length && <div className="text-sm text-muted-foreground">No upcoming holidays.</div>}
            </div>
          </CardContent>
        </Card>

        {/* QUICK ACTIONS */}
        <Card className="border-0 shadow-sm bg-primary/5 border-primary/10">
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="justify-start text-xs h-9 bg-background"><Users className="w-4 h-4 mr-2" /> Add Employee</Button>
              <Button variant="outline" className="justify-start text-xs h-9 bg-background"><ListChecks className="w-4 h-4 mr-2" /> Assign Task</Button>
              <Button variant="outline" className="justify-start text-xs h-9 bg-background"><Clock className="w-4 h-4 mr-2" /> Review Leaves</Button>
              <Button variant="outline" className="justify-start text-xs h-9 bg-background"><Receipt className="w-4 h-4 mr-2" /> Review Expenses</Button>
              <Button variant="outline" className="justify-start text-xs h-9 bg-background"><CalendarDays className="w-4 h-4 mr-2" /> Add Holiday</Button>
              <Button variant="outline" className="justify-start text-xs h-9 bg-background"><Bell className="w-4 h-4 mr-2" /> View Notifications</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <EmployeeActivityTable />
      </div>

    </div>
  );
}
