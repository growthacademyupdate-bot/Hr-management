"use client";

import { useMemo } from "react";
import { useAuth, useDB, api } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserCheck, UserX, Clock, ListChecks, CheckCircle2, AlertTriangle, Receipt, FileText, CalendarDays, Bell, Activity } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, EmployeeActivityTable } from "@/components/dashboard/SharedDashboardComponents"; 

export function HRDashboard() {
  const user = useAuth();
  const db = useDB();
  if (!user) return null;

  if (db.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="HR Dashboard" description="Loading data..." />
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
  
  const activeEmployees = db.employees.filter((e) => e.status === "Active").length;
  
  const todayAtt = db.attendance.filter((a) => a.date === today && employeeIds.has(a.employeeId));
  const present = todayAtt.filter((a) => a.firstLoginAt || (a.sessions && a.sessions.length > 0) || ["Present", "Half Day", "Short Day", "Incomplete"].includes(a.status)).length;
  
  const onLeaveToday = db.leaves.filter((l) => l.status === "admin_approved" && l.startDate <= today && l.endDate >= today && employeeIds.has(l.employeeId)).length;
  
  const pendingLeavesHR = db.leaves.filter((l) => l.status === "pending").length; // HR needs to review
  
  const pendingTasksReview = db.tasks.filter((t) => t.status === "completed").length; // HR needs to review these
  
  const pendingExpensesHR = db.expenses.filter((e) => e.status === "pending").length; // HR needs to review
  
  const attendanceIssues = todayAtt.filter((a) => a.status === "Late" || a.status === "Incomplete" || a.status === "Short Day").length;
  const unreadNotifs = db.notifications.filter(n => n.recipientId === user.employeeId && !n.isRead).length;

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

  const currentDateFormatted = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Good Morning, ${user.name.split(" ")[0]}`} 
        description={currentDateFormatted} 
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={activeEmployees} icon={Users} tone="primary" />
        <StatCard label="Present Today" value={present} icon={UserCheck} tone="success" trend={`${Math.round((present / Math.max(activeEmployees, 1)) * 100)}% attendance`} />
        <StatCard label="On Leave" value={onLeaveToday} icon={UserX} tone="warning" />
        <StatCard label="Pending Leaves (HR)" value={pendingLeavesHR} icon={Clock} tone="warning" trend="Action required" />
        <StatCard label="Task Reviews (HR)" value={pendingTasksReview} icon={ListChecks} tone="info" trend="Action required" />
        <StatCard label="Pending Expenses (HR)" value={pendingExpensesHR} icon={Receipt} tone="warning" trend="Action required" />
        <StatCard label="Attendance Issues" value={attendanceIssues} icon={AlertTriangle} tone="destructive" trend="Late/Incomplete" />
        <StatCard label="Unread Notifications" value={unreadNotifs} icon={Bell} tone="destructive" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle>Workforce Pulse</CardTitle></CardHeader>
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

        <Card className="border-0 shadow-sm overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle>Tasks Pending HR Review</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto flex-1 h-[288px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {db.tasks.filter(t => t.status === "completed").length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No tasks pending review.</TableCell></TableRow>
                )}
                {db.tasks.filter(t => t.status === "completed").slice(0, 5).map((t) => {
                  const emp = db.employees.find(e => e.id === t.assignedTo);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium text-sm">{t.title}</TableCell>
                      <TableCell>{emp?.name || t.assignedTo}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.completedAt ? new Date(t.completedAt).toLocaleDateString() : '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle>Recent Leave Requests</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {db.leaves.filter(l => l.status === "pending").length === 0 && <div className="text-sm text-muted-foreground">No pending leaves.</div>}
              {db.leaves.filter(l => l.status === "pending").slice(0, 4).map(l => {
                const emp = db.employees.find(e => e.id === l.employeeId);
                return (
                  <div key={l.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <div className="font-medium text-sm">{emp?.name}</div>
                      <div className="text-xs text-muted-foreground">{l.type}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{l.numberOfDays} days</Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle>Recent Expenses</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {db.expenses.filter(e => e.status === "pending").length === 0 && <div className="text-sm text-muted-foreground">No pending expenses.</div>}
              {db.expenses.filter(e => e.status === "pending").slice(0, 4).map(e => {
                const emp = db.employees.find(em => em.id === e.employeeId);
                return (
                  <div key={e.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <div className="font-medium text-sm">{emp?.name}</div>
                      <div className="text-xs text-muted-foreground">{e.category}</div>
                    </div>
                    <span className="font-bold text-sm">₹{e.amount.toLocaleString()}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-primary/5 border-primary/10">
          <CardHeader><CardTitle>HR Actions</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="justify-start text-xs h-9 bg-background"><Clock className="w-4 h-4 mr-2" /> Review Leaves</Button>
              <Button variant="outline" className="justify-start text-xs h-9 bg-background"><ListChecks className="w-4 h-4 mr-2" /> Review Tasks</Button>
              <Button variant="outline" className="justify-start text-xs h-9 bg-background"><Receipt className="w-4 h-4 mr-2" /> Review Expenses</Button>
              <Button variant="outline" className="justify-start text-xs h-9 bg-background"><Users className="w-4 h-4 mr-2" /> Add Employee</Button>
              <Button variant="outline" className="justify-start text-xs h-9 bg-background"><Activity className="w-4 h-4 mr-2" /> View Reports</Button>
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
