"use client";

import { useAuth, useDB } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, Activity, ListChecks, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area, Legend } from "recharts";

export default function Dashboard() {
  const user = useAuth();
  const db = useDB();
  if (!user) return null;

  const today = new Date().toISOString().slice(0, 10);
  const employeeIds = new Set(db.employees.map(e => e.id));
  const todayAtt = db.attendance.filter((a) => a.date === today && employeeIds.has(a.employeeId));
  const present = todayAtt.filter((a) => a.status === "Present").length;
  const absent = db.employees.length - todayAtt.length + todayAtt.filter((a) => a.status === "Absent").length;
  const active = db.employees.filter((e) => e.status === "Active").length;
  const completed = db.tasks.filter((t) => (t.status === "completed" || t.status === "reviewed") && employeeIds.has(t.assignedTo)).length;
  const pending = db.tasks.filter((t) => (t.status === "assigned" || t.status === "working_progress") && employeeIds.has(t.assignedTo)).length;
  const overdueTasks = db.tasks.filter(t => new Date() > new Date(t.dueDate) && !["completed", "reviewed"].includes(t.status)).length;
  const productivity = todayAtt.length ? Math.round(todayAtt.reduce((s, a) => s + a.productivity, 0) / todayAtt.length) : 0;

  if (user.role === "employee") return <EmployeeDashboard />;

  const attendancePie = [
    { name: "Present", value: present, color: "var(--color-success)" },
    { name: "Absent", value: Math.max(absent, 0), color: "var(--color-destructive)" },
    { name: "Leave", value: todayAtt.filter((a) => a.status === "Leave").length, color: "var(--color-warning)" },
  ];
  const taskPie = [
    { name: "Completed/Reviewed", value: completed, color: "var(--color-success)" },
    { name: "Working Progress", value: db.tasks.filter((t) => t.status === "working_progress").length, color: "var(--color-info)" },
    { name: "Assigned", value: db.tasks.filter((t) => t.status === "assigned").length, color: "var(--color-warning)" },
  ];

  // Weekly attendance
  const weekly = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const date = d.toISOString().slice(0, 10);
    const day = d.toLocaleDateString(undefined, { weekday: "short" });
    const recs = db.attendance.filter((a) => a.date === date);
    return {
      day,
      Present: recs.filter((r) => r.status === "Present").length,
      Absent: recs.filter((r) => r.status === "Absent").length,
      Leave: recs.filter((r) => r.status === "Leave").length,
    };
  });

  // Department performance
  const deptMap = new Map<string, { count: number; total: number }>();
  db.employees.forEach((e) => {
    const m = deptMap.get(e.department) || { count: 0, total: 0 };
    m.count++; m.total += 80 + Math.random() * 15;
    deptMap.set(e.department, m);
  });
  const deptData = Array.from(deptMap.entries()).map(([name, v]) => ({ name, performance: Math.round(v.total / v.count) }));

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back, ${user.name.split(" ")[0]}`} description="Here's what's happening across your organization today." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={db.employees.length} icon={Users} tone="primary" trend="+2 this month" />
        <StatCard label="Present Today" value={present} icon={UserCheck} tone="success" trend={`${Math.round((present/Math.max(db.employees.length,1))*100)}% attendance`} />
        <StatCard label="Absent" value={Math.max(absent, 0)} icon={UserX} tone="destructive" />
        <StatCard label="Active Now" value={active} icon={Activity} tone="info" />
        <StatCard label="Total Tasks" value={db.tasks.length} icon={ListChecks} tone="primary" />
        <StatCard label="Completed" value={completed} icon={CheckCircle2} tone="success" />
        {user.role === "admin" ? (
          <StatCard label="Pending" value={pending} icon={Clock} tone="warning" />
        ) : (
          <StatCard label="To Review" value={db.tasks.filter((t) => t.status === "completed").length} icon={Clock} tone="warning" />
        )}
        <StatCard label="Leave Requests" value={db.leaves.filter(l => l.status === (user.role === "admin" ? "hr_approved" : "pending")).length} icon={Clock} tone="warning" trend="Action needed" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader><CardTitle>Weekly Attendance Overview</CardTitle></CardHeader>
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

        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle>Task Analytics</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={taskPie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
                  {taskPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle>Attendance Today</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={attendancePie} dataKey="value" nameKey="name" outerRadius={90}>
                  {attendancePie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader><CardTitle>Department Performance</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar dataKey="performance" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle>Employee Activity</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>Logout</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-48">Productivity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {db.employees.slice(0, 8).map((emp) => {
                  const att = todayAtt.find((a) => a.employeeId === emp.id);
                  return (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8"><AvatarImage src={emp.avatar} /><AvatarFallback>{emp.name[0]}</AvatarFallback></Avatar>
                          <div>
                            <div className="font-medium">{emp.name}</div>
                            <div className="text-xs text-muted-foreground">{emp.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{emp.department}</TableCell>
                      <TableCell>{att?.firstLoginAt ? new Date(att.firstLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : att?.loginTime || "—"}</TableCell>
                      <TableCell>{att?.lastLogoutAt ? new Date(att.lastLogoutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : att?.logoutTime || "—"}</TableCell>
                      <TableCell>{att?.totalWorkingSeconds ? formatDuration(att.totalWorkingSeconds) : `${att?.workingHours || 0}h`}</TableCell>
                      <TableCell><StatusBadge status={att?.status || "Absent"} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Progress value={att?.productivity || 0} className="h-2" />
                          <span className="text-xs font-medium tabular-nums w-10">{att?.productivity || 0}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Present: "bg-success/15 text-success border-success/20",
    Absent: "bg-destructive/15 text-destructive border-destructive/20",
    Leave: "bg-warning/15 text-warning border-warning/20",
    "Half Day": "bg-info/15 text-info border-info/20",
    "Short Day": "bg-warning/15 text-warning border-warning/20",
    Incomplete: "bg-muted text-muted-foreground border-border",
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
  return <Badge variant="outline" className={map[status] || ""}>{status}</Badge>;
}

function formatDuration(seconds?: number) {
  if (!seconds) return "0h 0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function EmployeeDashboard() {
  const user = useAuth();
  const db = useDB();
  if (!user?.employeeId) return null;
  const empId = user.employeeId;
  const today = new Date().toISOString().slice(0, 10);
  const employeeIds = new Set(db.employees.map(e => e.id));
  const todayAtt = db.attendance.find((a) => a.employeeId === empId && a.date === today && employeeIds.has(a.employeeId));
  const myTasks = db.tasks.filter((t) => t.assignedTo === empId && employeeIds.has(t.assignedTo));
  const completedTasks = myTasks.filter((t) => t.status === "completed" || t.status === "reviewed").length;
  const overdueTasks = myTasks.filter(t => new Date() > new Date(t.dueDate) && !["completed", "reviewed"].includes(t.status)).length;

  const weekly = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const date = d.toISOString().slice(0, 10);
    const rec = db.attendance.find((a) => a.employeeId === empId && a.date === date && employeeIds.has(a.employeeId));
    return { day: d.toLocaleDateString(undefined, { weekday: "short" }), hours: rec?.workingHours || 0 };
  });

  const myActivities = db.activities.filter((a) => a.employeeId === empId && employeeIds.has(a.employeeId)).slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader title={`Hi ${user.name.split(" ")[0]} 👋`} description="Here's your work summary for today." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Login" value={todayAtt?.firstLoginAt ? new Date(todayAtt.firstLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : todayAtt?.loginTime || "—"} icon={Clock} tone="info" />
        <StatCard label="Working Hours" value={todayAtt?.totalWorkingSeconds ? formatDuration(todayAtt.totalWorkingSeconds) : `${todayAtt?.workingHours || 0}h`} icon={Activity} tone="primary" />
        <StatCard label="Assigned Tasks" value={myTasks.length} icon={ListChecks} tone="primary" />
        <StatCard label="Completed" value={completedTasks} icon={CheckCircle2} tone="success" />
        <StatCard label="Leave Requests" value={db.leaves.filter(l => l.employeeId === empId).length} icon={Clock} tone="info" trend={`${db.leaves.filter(l => l.employeeId === empId && l.status === "admin_approved").length} approved`} />
        <StatCard label="Productivity" value={`${todayAtt?.productivity || 0}%`} icon={TrendingUp} tone="success" />
        <StatCard label="Pending" value={myTasks.filter(t => t.status === "assigned").length} icon={Clock} tone="warning" />
        <StatCard label="In Progress" value={myTasks.filter(t => t.status === "working_progress").length} icon={Activity} tone="info" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle>Weekly Hours</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar dataKey="hours" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <CardContent>
            <ol className="relative border-l border-border ml-3 space-y-4">
              {myActivities.length === 0 && <div className="text-sm text-muted-foreground">No activity yet today.</div>}
              {myActivities.map((a) => (
                <li key={a.id} className="ml-4">
                  <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-primary mt-1.5" />
                  <time className="text-xs text-muted-foreground">{new Date(a.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                  <p className="text-sm font-medium">{a.label}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
