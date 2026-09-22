"use client";

import { useMemo, useState } from "react";
import { useAuth, useDB, api } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, UserCheck, UserX, Activity, ListChecks, CheckCircle2, Clock, TrendingUp, Search, RotateCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area, Legend } from "recharts";
import { useDataTable } from "@/hooks/useDataTable";
import { SortableHeader } from "@/components/SortableHeader";
import { DataTablePagination } from "@/components/DataTablePagination";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const user = useAuth();
  const db = useDB();
  const [isRefreshing, setIsRefreshing] = useState(false);
  if (!user) return null;

  if (db.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Loading data..." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="col-span-4 h-96 w-full" />
          <Skeleton className="col-span-3 h-96 w-full" />
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const employeeIds = new Set(db.employees.map(e => e.id));
  const isTodayHoliday = db.holidays?.some(h => h.isActive && h.holidayType === "COMPANY_HOLIDAY" && h.startDate <= today && h.endDate >= today);
  
  // Today's attendance records for recognized employees
  const todayAtt = db.attendance.filter((a) => a.date === today && employeeIds.has(a.employeeId));

  // Present today: any employee who has logged in today or marked Present/Half Day/Short Day/Incomplete
  const present = todayAtt.filter((a) => 
    a.firstLoginAt || 
    (a.sessions && a.sessions.length > 0) || 
    ["Present", "Half Day", "Short Day", "Incomplete"].includes(a.status)
  ).length;

  // Active now: how many employees are logged in RIGHT NOW (active session without logoutAt)
  const activeNow = todayAtt.filter((a) => a.sessions?.some((s: any) => !s.logoutAt)).length;

  // Approved leave today
  const onLeaveToday = db.leaves.filter(l => 
    l.status === "admin_approved" && 
    l.startDate <= today && 
    l.endDate >= today && 
    employeeIds.has(l.employeeId)
  ).length;

  // Absent count: total registered employees minus those present and minus approved leave
  const absent = isTodayHoliday ? 0 : Math.max(db.employees.length - present - onLeaveToday, 0);

  // New joiners this month
  const thisMonth = today.slice(0, 7);
  const joinedThisMonth = db.employees.filter(e => e.joiningDate && e.joiningDate.slice(0, 7) === thisMonth).length;

  // Tasks calculations
  const totalTasks = db.tasks.filter((t) => employeeIds.has(t.assignedTo)).length;
  const completed = db.tasks.filter((t) => (t.status === "completed" || t.status === "reviewed") && employeeIds.has(t.assignedTo)).length;
  const pending = db.tasks.filter((t) => (t.status === "assigned" || t.status === "working_progress") && employeeIds.has(t.assignedTo)).length;
  const overdueTasks = db.tasks.filter(t => new Date() > new Date(t.dueDate) && !["completed", "reviewed"].includes(t.status) && employeeIds.has(t.assignedTo)).length;
  
  // Leaves pending admin review
  const pendingLeaves = db.leaves.filter(l => l.status === (user.role === "admin" ? "hr_approved" : "pending")).length;

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await api.refreshDB();
    setTimeout(() => setIsRefreshing(false), 500);
    toast.success("Dashboard data updated");
  };

  if (user.role === "employee") return <EmployeeDashboard />;

  const attendancePie = [
    { name: "Present", value: present, color: "var(--color-success)" },
    { name: "Absent", value: Math.max(absent, 0), color: "var(--color-destructive)" },
    { name: "Leave", value: onLeaveToday, color: "var(--color-warning)" },
    ...(isTodayHoliday ? [{ name: "Holiday", value: Math.max(db.employees.length - present, 0), color: "var(--color-info)" }] : []),
  ].filter(item => item.value > 0);

  const taskPie = [
    { name: "Completed/Reviewed", value: completed, color: "var(--color-success)" },
    { name: "Working Progress", value: db.tasks.filter((t) => t.status === "working_progress" && employeeIds.has(t.assignedTo)).length, color: "var(--color-info)" },
    { name: "Assigned", value: db.tasks.filter((t) => t.status === "assigned" && employeeIds.has(t.assignedTo)).length, color: "var(--color-warning)" },
  ].filter(item => item.value > 0);

  // Weekly attendance
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

  // Department performance
  const deptMap = new Map<string, { count: number; totalProd: number }>();
  db.employees.forEach((e) => {
    const empAtt = todayAtt.find(a => a.employeeId === e.id);
    const m = deptMap.get(e.department) || { count: 0, totalProd: 0 };
    m.count++;
    m.totalProd += (empAtt?.productivity || (empAtt ? 80 : 0));
    deptMap.set(e.department, m);
  });
  const deptData = Array.from(deptMap.entries()).map(([name, v]) => ({ 
    name, 
    performance: v.count > 0 ? Math.round(v.totalProd / v.count) : 0 
  }));

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Welcome back, ${user.name.split(" ")[0]}`} 
        description="Here's what's happening across your organization today."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>LIVE</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="h-8 text-xs gap-1.5 cursor-pointer"
            >
              <RotateCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
              <span>Refresh</span>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          label="Total Employees" 
          value={db.employees.length} 
          icon={Users} 
          tone="primary" 
          trend={joinedThisMonth > 0 ? `+${joinedThisMonth} this month` : `${db.employees.filter(e => e.status === "Active").length} active accounts`} 
        />
        <StatCard 
          label="Present Today" 
          value={present} 
          icon={UserCheck} 
          tone="success" 
          trend={`${Math.round((present / Math.max(db.employees.length, 1)) * 100)}% attendance`} 
        />
        <StatCard 
          label="Absent" 
          value={Math.max(absent, 0)} 
          icon={UserX} 
          tone="destructive" 
          trend={isTodayHoliday ? "Holiday" : onLeaveToday > 0 ? `${onLeaveToday} on leave` : "Not checked in"}
        />
        <StatCard 
          label="Active Now" 
          value={activeNow} 
          icon={Activity} 
          tone="info" 
          pulse={activeNow > 0}
          trend={`${activeNow} of ${db.employees.length} logged in`} 
        />
        <StatCard 
          label="Total Tasks" 
          value={totalTasks} 
          icon={ListChecks} 
          tone="primary" 
          trend={`${totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0}% completed`}
        />
        <StatCard 
          label="Completed" 
          value={completed} 
          icon={CheckCircle2} 
          tone="success" 
          trend={`${completed} tasks finished`}
        />
        {user.role === "admin" ? (
          <StatCard 
            label="Pending" 
            value={pending} 
            icon={Clock} 
            tone="warning" 
            trend={overdueTasks > 0 ? `${overdueTasks} overdue` : "In progress"}
          />
        ) : (
          <StatCard 
            label="To Review" 
            value={db.tasks.filter((t) => t.status === "completed" && employeeIds.has(t.assignedTo)).length} 
            icon={Clock} 
            tone="warning" 
          />
        )}
        <StatCard 
          label="Leave Requests" 
          value={pendingLeaves} 
          icon={Clock} 
          tone="warning" 
          trend={pendingLeaves > 0 ? "Action needed" : "All cleared"} 
        />
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

      <EmployeeActivityTable todayAtt={todayAtt} />
    </div>
  );
}

function EmployeeActivityTable({ todayAtt }: { todayAtt: any[] }) {
  const db = useDB();
  const today = new Date().toISOString().slice(0, 10);

  const activityData = useMemo(() => {
    return db.employees.map((emp) => {
      const att = todayAtt.find((a) => a.employeeId === emp.id);
      const activeSession = att?.sessions?.find((s: any) => !s.logoutAt);
      const isOnline = Boolean(activeSession);
      const onLeave = db.leaves.some(l => l.employeeId === emp.id && l.status === "admin_approved" && l.startDate <= today && l.endDate >= today);

      let status = "Absent";
      if (isOnline) {
        status = "Active Now";
      } else if (att) {
        status = att.status === "Incomplete" ? "Present" : att.status;
      } else if (onLeave) {
        status = "Leave";
      }

      // Calculate elapsed active working duration including live open session
      const ongoingSeconds = activeSession ? Math.max(0, Math.floor((Date.now() - new Date(activeSession.loginAt).getTime()) / 1000)) : 0;
      const totalSecs = (att?.totalWorkingSeconds || (att?.workingHours ? att.workingHours * 3600 : 0)) + ongoingSeconds;

      return {
        id: emp.id,
        name: emp.name,
        avatar: emp.avatar,
        department: emp.department,
        status,
        isOnline,
        firstLoginAt: att?.firstLoginAt,
        loginTime: att?.firstLoginAt ? new Date(att.firstLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (att?.loginTime || "—"),
        lastLogoutAt: att?.lastLogoutAt,
        logoutTime: isOnline ? "Active Now" : (att?.lastLogoutAt ? new Date(att.lastLogoutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (att?.logoutTime || "—")),
        workingSeconds: totalSecs,
        hoursLabel: totalSecs > 0 ? formatDuration(totalSecs) : "0h 0m",
        productivity: att?.productivity || 0,
      };
    });
  }, [db.employees, db.leaves, todayAtt, today]);

  const { search, setSearch, sortField, sortOrder, toggleSort, page, setPage, pageSize, setPageSize, totalPages, totalItems, startIndex, endIndex, paginatedData } = useDataTable({
    data: activityData,
    searchFields: (e) => [e.name, e.id, e.department, e.status, e.loginTime, e.logoutTime],
    defaultSortField: "name",
    defaultSortOrder: "asc",
    defaultPageSize: 5,
  });

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <CardTitle>Employee Activity</CardTitle>
        <div className="relative w-full sm:w-64">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search employee activity..." className="pl-9 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="name" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Employee</SortableHeader>
                <SortableHeader field="department" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Department</SortableHeader>
                <SortableHeader field="loginTime" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Login</SortableHeader>
                <SortableHeader field="logoutTime" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Logout</SortableHeader>
                <SortableHeader field="workingSeconds" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Hours</SortableHeader>
                <SortableHeader field="status" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Status</SortableHeader>
                <SortableHeader field="productivity" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort} className="w-48">Productivity</SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No matching activity.</TableCell></TableRow>
              ) : paginatedData.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={emp.avatar} />
                          <AvatarFallback>{emp.name[0]}</AvatarFallback>
                        </Avatar>
                        {emp.isOnline && (
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" title="Online" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{emp.name}</div>
                        <div className="text-xs text-muted-foreground">{emp.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{emp.department}</TableCell>
                  <TableCell>{emp.loginTime}</TableCell>
                  <TableCell>{emp.logoutTime}</TableCell>
                  <TableCell>{emp.hoursLabel}</TableCell>
                  <TableCell><StatusBadge status={emp.status} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Progress value={emp.productivity} className="h-2" />
                      <span className="text-xs font-medium tabular-nums w-10">{emp.productivity}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination page={page} pageSize={pageSize} totalPages={totalPages} totalItems={totalItems} startIndex={startIndex} endIndex={endIndex} onPageChange={setPage} onPageSizeChange={setPageSize} pageSizeOptions={[5, 10, 20]} />
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "Active Now": "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium",
    Present: "bg-success/15 text-success border-success/20",
    Absent: "bg-destructive/15 text-destructive border-destructive/20",
    Leave: "bg-warning/15 text-warning border-warning/20",
    "Half Day": "bg-info/15 text-info border-info/20",
    "Short Day": "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
    Incomplete: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
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
  return (
    <Badge variant="outline" className={cn("inline-flex items-center gap-1.5", map[status] || "")}>
      {status === "Active Now" && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      )}
      {status}
    </Badge>
  );
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
  const upcomingHolidays = db.holidays?.filter(h => h.isActive && h.startDate >= today).sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).slice(0, 3) || [];

  const activeTasks = myTasks.filter((t) => t.status === "assigned" || t.status === "working_progress");
  const activeSession = todayAtt?.sessions?.find((s: any) => !s.logoutAt);
  const ongoingSeconds = activeSession ? Math.max(0, Math.floor((Date.now() - new Date(activeSession.loginAt).getTime()) / 1000)) : 0;
  const totalWorkingSecs = (todayAtt?.totalWorkingSeconds || (todayAtt?.workingHours ? todayAtt.workingHours * 3600 : 0)) + ongoingSeconds;

  return (
    <div className="space-y-6">
      <PageHeader title={`Hi ${user.name.split(" ")[0]} 👋`} description="Here's your work summary for today." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Login" value={todayAtt?.firstLoginAt ? new Date(todayAtt.firstLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : todayAtt?.loginTime || "—"} icon={Clock} tone="info" trend={activeSession ? "Currently Active" : (todayAtt ? "Logged Out" : "Not Logged In")} />
        <StatCard label="Working Hours" value={totalWorkingSecs > 0 ? formatDuration(totalWorkingSecs) : `${todayAtt?.workingHours || 0}h`} icon={Activity} tone="primary" />
        <StatCard label="Assigned Tasks" value={myTasks.length} icon={ListChecks} tone="primary" />
        <StatCard label="Completed" value={completedTasks} icon={CheckCircle2} tone="success" />
        <StatCard label="Leave Requests" value={db.leaves.filter(l => l.employeeId === empId).length} icon={Clock} tone="info" trend={`${db.leaves.filter(l => l.employeeId === empId && l.status === "admin_approved").length} approved`} />
        <StatCard label="Productivity" value={`${todayAtt?.productivity || 0}%`} icon={TrendingUp} tone="success" />
        <StatCard label="Pending" value={myTasks.filter(t => t.status === "assigned").length} icon={Clock} tone="warning" />
        <StatCard label="In Progress" value={myTasks.filter(t => t.status === "working_progress").length} icon={Activity} tone="info" />
      </div>

      {activeTasks.length > 0 && (
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">My Active Tasks</CardTitle>
            <Badge variant="outline" className="text-xs">{activeTasks.length} pending</Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
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
      )}

      <div className="grid lg:grid-cols-3 gap-4">
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
            <ol className="relative border-l border-border ml-3 space-y-4 h-64 overflow-y-auto pr-2">
              {myActivities.length === 0 && <div className="text-sm text-muted-foreground">No activity yet today.</div>}
              {myActivities.map((a) => (
                <li key={a.id} className="ml-4">
                  <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-primary mt-1.5" />
                  <div className="flex justify-between items-start">
                    <time className="text-xs text-muted-foreground">{new Date(a.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                    {a.module && <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-muted px-1 rounded">{a.module}</span>}
                  </div>
                  <p className="text-sm font-medium mt-1">{a.label}</p>
                  {a.actorRole && a.actorRole !== "employee" && (
                    <p className="text-xs text-muted-foreground mt-0.5">Performed By: <span className="capitalize">{a.actorRole}</span></p>
                  )}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle>Upcoming Holidays</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingHolidays.length === 0 && <div className="text-sm text-muted-foreground">No upcoming holidays.</div>}
              {upcomingHolidays.map((h) => (
                <div key={h.id} className="flex flex-col gap-1 bg-muted/40 p-3 rounded-lg border border-border/50">
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-sm leading-none">{h.name}</p>
                    <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 ${h.holidayType === "COMPANY_HOLIDAY" ? "bg-success/10 text-success" : ""}`}>
                      {h.holidayType.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(h.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    {h.startDate !== h.endDate && ` - ${new Date(h.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
