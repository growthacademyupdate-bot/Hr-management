"use client";

import { useMemo } from "react";
import { useAuth, useDB, api } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, Activity, ListChecks, CheckCircle2, TrendingUp, Calendar, Receipt } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/dashboard/SharedDashboardComponents";

function formatDuration(seconds?: number) {
  if (!seconds) return "0h 0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function EmployeeDashboard() {
  const user = useAuth();
  const db = useDB();
  if (!user?.employeeId) return null;

  if (db.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Dashboard" description="Loading data..." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  const empId = user.employeeId;
  const today = new Date().toISOString().slice(0, 10);
  const employeeIds = new Set(db.employees.map(e => e.id));
  
  // Attendance
  const todayAtt = db.attendance.find((a) => a.employeeId === empId && a.date === today && employeeIds.has(a.employeeId));
  const activeSession = todayAtt?.sessions?.find((s: any) => !s.logoutAt);
  const ongoingSeconds = activeSession ? Math.max(0, Math.floor((Date.now() - new Date(activeSession.loginAt).getTime()) / 1000)) : 0;
  const totalWorkingSecs = (todayAtt?.totalWorkingSeconds || (todayAtt?.workingHours ? todayAtt.workingHours * 3600 : 0)) + ongoingSeconds;

  // Tasks
  const myTasks = db.tasks.filter((t) => t.assignedTo === empId && employeeIds.has(t.assignedTo));
  const completedTasks = myTasks.filter((t) => t.status === "completed" || t.status === "reviewed").length;
  const pendingTasks = myTasks.filter((t) => t.status === "assigned" || t.status === "working_progress").length;
  const activeTasks = myTasks.filter((t) => t.status === "assigned" || t.status === "working_progress");

  // Expenses
  const myExpenses = db.expenses.filter((e) => e.employeeId === empId);
  const pendingExpenses = myExpenses.filter((e) => e.status === "pending" || e.status === "hr_approved").length;

  // Leaves
  const myLeaves = db.leaves.filter((l) => l.employeeId === empId);
  
  // Notifications
  const unreadNotifs = db.notifications.filter((n) => n.recipientId === empId && !n.isRead).length;

  // Weekly attendance chart
  const weekly = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const date = d.toISOString().slice(0, 10);
    const rec = db.attendance.find((a) => a.employeeId === empId && a.date === date && employeeIds.has(a.employeeId));
    return { day: d.toLocaleDateString(undefined, { weekday: "short" }), hours: rec?.workingHours || 0 };
  });

  const currentDateFormatted = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Good Morning, ${user.name.split(" ")[0]}`} 
        description={currentDateFormatted} 
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Login" value={todayAtt?.firstLoginAt ? new Date(todayAtt.firstLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : todayAtt?.loginTime || "—"} icon={Clock} tone="info" trend={activeSession ? "Currently Active" : (todayAtt ? "Logged Out" : "Not Logged In")} />
        <StatCard label="Working Hours" value={totalWorkingSecs > 0 ? formatDuration(totalWorkingSecs) : `${todayAtt?.workingHours || 0}h`} icon={Activity} tone="primary" />
        <StatCard label="Pending Tasks" value={pendingTasks} icon={ListChecks} tone="warning" />
        <StatCard label="Completed Tasks" value={completedTasks} icon={CheckCircle2} tone="success" />
        <StatCard label="Pending Expenses" value={pendingExpenses} icon={Receipt} tone="info" />
        <StatCard label="Unread Notifications" value={unreadNotifs} icon={Activity} tone="destructive" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* MY TASKS */}
        <Card className="border-0 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <CardHeader className="flex flex-row items-center justify-between pb-3 shrink-0">
            <CardTitle className="text-base font-semibold">My Active Tasks</CardTitle>
            <Badge variant="outline" className="text-xs">{activeTasks.length} pending</Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 overflow-y-auto flex-1 pr-2">
            {activeTasks.length === 0 && <div className="text-sm text-muted-foreground flex items-center justify-center h-full">No pending tasks.</div>}
            {activeTasks.map((t) => (
              <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/30 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{t.title}</span>
                    <Badge variant="outline" className="capitalize text-[11px] py-0">{t.priority}</Badge>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                  <div className="text-[11px] text-muted-foreground">Due: {t.dueDate}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {t.status === "assigned" && (
                    <Button size="sm" variant="outline" className="text-xs h-8" onClick={async () => {
                      await api.updateTaskStatus(t.id, "working_progress");
                      toast.success("Task marked as Working Progress");
                    }}>
                      Working Progress
                    </Button>
                  )}
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs h-8" onClick={async () => {
                    await api.updateTaskStatus(t.id, "completed");
                    toast.success("Task marked as Completed!");
                  }}>
                    Completed
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* MY ATTENDANCE */}
        <Card className="border-0 shadow-sm h-[400px] flex flex-col">
          <CardHeader className="shrink-0"><CardTitle>Weekly Attendance (Hours)</CardTitle></CardHeader>
          <CardContent className="flex-1 min-h-0">
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
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* MY LEAVE */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My Leaves</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <div className="bg-muted p-3 rounded-lg text-center">
                <div className="text-2xl font-bold">{myLeaves.filter(l => l.status === "pending" || l.status === "hr_approved").length}</div>
                <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Pending</div>
              </div>
              <div className="bg-success/10 text-success p-3 rounded-lg text-center">
                <div className="text-2xl font-bold">{myLeaves.filter(l => l.status === "admin_approved").length}</div>
                <div className="text-[10px] uppercase font-semibold tracking-wider">Approved</div>
              </div>
              <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-center">
                <div className="text-2xl font-bold">{myLeaves.filter(l => l.status === "admin_rejected" || l.status === "hr_rejected").length}</div>
                <div className="text-[10px] uppercase font-semibold tracking-wider">Rejected</div>
              </div>
              <div className="bg-info/10 text-info p-3 rounded-lg text-center">
                <div className="text-2xl font-bold">{myLeaves.filter(l => l.status === "admin_approved" && l.startDate > today).length}</div>
                <div className="text-[10px] uppercase font-semibold tracking-wider">Upcoming</div>
              </div>
            </div>
            {/* Ideally a button to apply leave, but for now they can navigate via sidebar */}
          </CardContent>
        </Card>

        {/* MY EXPENSES */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My Expenses (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <div className="bg-muted p-3 rounded-lg text-center">
                <div className="text-2xl font-bold">₹{myExpenses.filter(e => e.status === "pending").reduce((a,b)=>a+b.amount,0).toLocaleString('en-IN')}</div>
                <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Pending HR</div>
              </div>
              <div className="bg-warning/10 text-warning p-3 rounded-lg text-center">
                <div className="text-2xl font-bold">₹{myExpenses.filter(e => e.status === "hr_approved").reduce((a,b)=>a+b.amount,0).toLocaleString('en-IN')}</div>
                <div className="text-[10px] uppercase font-semibold tracking-wider">Pending Admin</div>
              </div>
              <div className="bg-success/10 text-success p-3 rounded-lg text-center">
                <div className="text-2xl font-bold">₹{myExpenses.filter(e => e.status === "admin_approved").reduce((a,b)=>a+b.amount,0).toLocaleString('en-IN')}</div>
                <div className="text-[10px] uppercase font-semibold tracking-wider">Approved</div>
              </div>
              <div className="bg-info/10 text-info p-3 rounded-lg text-center">
                <div className="text-2xl font-bold">₹{myExpenses.filter(e => e.status === "reimbursed").reduce((a,b)=>a+b.amount,0).toLocaleString('en-IN')}</div>
                <div className="text-[10px] uppercase font-semibold tracking-wider">Reimbursed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
