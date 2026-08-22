"use client";

import { useState } from "react";
import { useAuth, useDB, api } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Mail, Phone, Calendar, Briefcase, IndianRupee, ShieldCheck,
  Camera, Loader2, Shield, Users, ListChecks, CheckCircle2,
  Clock, CalendarOff, Activity, TrendingUp, Star, Award,
  Building2, Hash, UserCheck, Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "../dashboard/page";

function StatMini({ icon: Icon, label, value, sub, color = "primary" }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-green-500/10 text-green-600",
    warning: "bg-yellow-500/10 text-yellow-600",
    info: "bg-blue-500/10 text-blue-600",
    destructive: "bg-red-500/10 text-red-600",
  };
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border bg-card shadow-sm">
      <div className={`h-10 w-10 rounded-lg grid place-items-center shrink-0 ${colorMap[color] || colorMap.primary}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="font-bold text-lg leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number | React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-muted last:border-0">
      <div className="h-8 w-8 rounded-md bg-muted grid place-items-center shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className="font-semibold mt-0.5">{value}</div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const user = useAuth();
  const db = useDB();
  const [uploading, setUploading] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  if (!user) return null;

  const emp = user.employeeId ? db.employees.find((e) => e.id === user.employeeId) : null;
  const today = new Date().toISOString().slice(0, 10);

  // Stats for admin/hr
  const totalEmployees = db.employees.length;
  const activeEmployees = db.employees.filter(e => e.status === "Active").length;
  const presentToday = db.attendance.filter(a => a.date === today && a.status === "Present").length;
  const pendingLeaves = db.leaves.filter(l =>
    user.role === "admin" ? l.status === "hr_approved" : l.status === "pending"
  ).length;

  // Stats for employee
  const myTasks = emp ? db.tasks.filter(t => t.assignedTo === emp.id) : [];
  const myCompletedTasks = myTasks.filter(t => t.status === "completed" || t.status === "reviewed").length;
  const myPendingTasks = myTasks.filter(t => t.status === "assigned").length;
  const myInProgress = myTasks.filter(t => t.status === "working_progress").length;
  const myLeaves = emp ? db.leaves.filter(l => l.employeeId === emp.id) : [];
  const myApprovedLeaves = myLeaves.filter(l => l.status === "admin_approved").length;
  const myPendingLeaves = myLeaves.filter(l => l.status === "pending" || l.status === "hr_approved").length;
  const todayAtt = emp ? db.attendance.find(a => a.employeeId === emp.id && a.date === today) : null;
  const completionRate = myTasks.length ? Math.round((myCompletedTasks / myTasks.length) * 100) : 0;

  // Avg HR rating for employee
  const ratedTasks = myTasks.filter(t => t.hrRating);
  const avgRating = ratedTasks.length
    ? (ratedTasks.reduce((s, t) => s + (parseInt(t.hrRating!.split("/")[0]) || 0), 0) / ratedTasks.length).toFixed(1)
    : null;

  // Recent activities
  const recentActivities = emp
    ? db.activities.filter(a => a.employeeId === emp.id).slice(0, 5)
    : db.activities.slice(0, 5);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 4 * 1024 * 1024) { toast.error("Image must be under 4MB"); return; }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        if (user.role === "admin") await api.updateSystemSetting("admin_avatar", base64);
        else if (user.role === "hr") await api.updateSystemSetting("hr_avatar", base64);
        else if (user.employeeId) await api.updateEmployee(user.employeeId, { avatar: base64 });

        const updatedUser = { ...user, avatar: base64 };
        localStorage.setItem("ems_auth_v1", JSON.stringify(updatedUser));
        window.dispatchEvent(new Event("ems_auth_change"));
        toast.success("Profile photo updated!");
      } catch { toast.error("Failed to update photo"); }
      finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Your personal information, activity stats, and work summary."
      />

      {/* TOP: Avatar + Name + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Avatar Card */}
        <Card className="border-0 shadow-sm lg:col-span-1">
          <CardContent className="pt-8 pb-6 flex flex-col items-center text-center space-y-4">
            <div 
              className="relative group cursor-pointer"
              onClick={() => setIsImageModalOpen(true)}
              title="Click to view & change profile photo"
            >
              <Avatar className="h-32 w-32 ring-4 ring-primary/10 transition-all group-hover:ring-primary/30">
                <AvatarImage src={user.avatar} className="object-cover" />
                <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                  {user.name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 className="h-6 w-6 mb-1" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">View Photo</span>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold">{user.name}</h3>
              <p className="text-sm text-muted-foreground capitalize font-medium">{user.role}</p>
              {emp && (
                <div className="flex flex-wrap justify-center gap-1 mt-2">
                  <StatusBadge status={emp.status} />
                  <Badge variant="outline" className="text-xs">{emp.department}</Badge>
                </div>
              )}
              {!emp && (
                <Badge variant="outline" className="mt-2 capitalize">{user.role} Access</Badge>
              )}
            </div>

            {emp && todayAtt && (
              <div className="w-full pt-2 border-t space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Today's Attendance</p>
                <StatusBadge status={todayAtt.status} />
                {todayAtt.loginTime && (
                  <p className="text-xs text-muted-foreground">
                    In: <span className="font-semibold text-foreground">{todayAtt.loginTime}</span>
                    {todayAtt.logoutTime && <> · Out: <span className="font-semibold text-foreground">{todayAtt.logoutTime}</span></>}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4 content-start">
          {emp ? (
            <>
              <StatMini icon={ListChecks} label="Total Tasks" value={myTasks.length} color="primary" />
              <StatMini icon={CheckCircle2} label="Completed" value={myCompletedTasks} sub={`${completionRate}% rate`} color="success" />
              <StatMini icon={Activity} label="In Progress" value={myInProgress} color="info" />
              <StatMini icon={Clock} label="Pending Tasks" value={myPendingTasks} color="warning" />
              <StatMini icon={CalendarOff} label="Leaves Taken" value={myApprovedLeaves} sub={`${myPendingLeaves} pending`} color="info" />
              <StatMini icon={TrendingUp} label="Productivity" value={`${todayAtt?.productivity || 0}%`} sub="today" color="success" />
              {avgRating && (
                <StatMini icon={Star} label="Avg HR Rating" value={`${avgRating}/10`} sub={`${ratedTasks.length} rated tasks`} color="warning" />
              )}
              <StatMini icon={IndianRupee} label="Monthly Salary" value={`₹${emp.salary?.toLocaleString() || "—"}`} color="primary" />
              <StatMini icon={UserCheck} label="Employee ID" value={emp.id} color="info" />
            </>
          ) : (
            <>
              <StatMini icon={Users} label="Total Employees" value={totalEmployees} sub={`${activeEmployees} active`} color="primary" />
              <StatMini icon={UserCheck} label="Present Today" value={presentToday} sub={`of ${totalEmployees}`} color="success" />
              <StatMini icon={CalendarOff} label="Leave Requests" value={pendingLeaves} sub="awaiting action" color="warning" />
              <StatMini icon={ListChecks} label="Total Tasks" value={db.tasks.length} color="primary" />
              <StatMini icon={CheckCircle2} label="Completed Tasks"
                value={db.tasks.filter(t => t.status === "completed" || t.status === "reviewed").length}
                color="success"
              />
              <StatMini icon={Building2} label="Departments"
                value={new Set(db.employees.map(e => e.department)).size}
                color="info"
              />
            </>
          )}
        </div>
      </div>

      {/* BOTTOM: Details + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Profile Details */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Profile Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <div>
                <InfoRow icon={Mail} label="Email Address" value={user.email} />
                {emp ? (
                  <>
                    <InfoRow icon={Phone} label="Mobile Number" value={emp.mobile || "Not specified"} />
                    <InfoRow icon={Briefcase} label="Department" value={emp.department} />
                    <InfoRow icon={Hash} label="Designation" value={emp.designation || "Not specified"} />
                  </>
                ) : (
                  <>
                    <InfoRow icon={Shield} label="Access Role" value={<span className="capitalize">{user.role} — System Administrator</span>} />
                    <InfoRow icon={Building2} label="Organization" value="AlMawa International" />
                    <InfoRow icon={UserCheck} label="Account Type" value="System Access Account" />
                  </>
                )}
              </div>
              <div>
                {emp ? (
                  <>
                    <InfoRow icon={Calendar} label="Joining Date" value={new Date(emp.joiningDate).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })} />
                    <InfoRow icon={IndianRupee} label="Monthly Salary" value={`₹${emp.salary?.toLocaleString() || "—"}`} />
                    <InfoRow icon={ShieldCheck} label="Employee ID" value={<span className="uppercase font-mono">{emp.id}</span>} />
                    <InfoRow icon={Award} label="Employment Status" value={<StatusBadge status={emp.status} />} />
                  </>
                ) : (
                  <>
                    <InfoRow icon={Calendar} label="Session" value="Currently Active" />
                    <InfoRow icon={ShieldCheck} label="Permissions" value="Full System Access" />
                    <InfoRow icon={Award} label="Status" value={<Badge className="bg-green-500/15 text-green-600 border-green-500/20" variant="outline">Active</Badge>} />
                  </>
                )}
              </div>
            </div>

            {/* Task Progress Bar for employees */}
            {emp && myTasks.length > 0 && (
              <div className="mt-6 pt-4 border-t space-y-3">
                <p className="text-sm font-semibold">Task Completion Progress</p>
                <div className="flex items-center gap-3">
                  <Progress value={completionRate} className="flex-1 h-2.5" />
                  <span className="text-sm font-bold tabular-nums w-12 text-right">{completionRate}%</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-md bg-yellow-500/10 text-yellow-700">
                    <div className="font-bold text-base">{myPendingTasks}</div>
                    <div className="text-muted-foreground">Pending</div>
                  </div>
                  <div className="p-2 rounded-md bg-blue-500/10 text-blue-700">
                    <div className="font-bold text-base">{myInProgress}</div>
                    <div className="text-muted-foreground">In Progress</div>
                  </div>
                  <div className="p-2 rounded-md bg-green-500/10 text-green-700">
                    <div className="font-bold text-base">{myCompletedTasks}</div>
                    <div className="text-muted-foreground">Completed</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-0 shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-sm text-muted-foreground">
                <Activity className="h-8 w-8 mb-2 opacity-30" />
                No recent activity
              </div>
            ) : (
              <ol className="relative border-l border-muted ml-3 space-y-5">
                {recentActivities.map((a) => (
                  <li key={a.id} className="ml-4">
                    <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-primary/60 border-2 border-background mt-0.5" />
                    <time className="text-[11px] text-muted-foreground">
                      {new Date(a.time).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </time>
                    <p className="text-sm font-medium mt-0.5 leading-snug">{a.label}</p>
                    {a.module && (
                      <span className="text-[10px] uppercase font-semibold tracking-wider bg-muted text-muted-foreground px-1.5 py-0.5 rounded mt-1 inline-block">
                        {a.module}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            )}

            {/* Leave summary for employee */}
            {emp && (
              <div className="mt-6 pt-4 border-t space-y-2">
                <p className="text-sm font-semibold mb-3">Leave Summary</p>
                {[
                  { label: "Total Applied", val: myLeaves.length, color: "text-foreground" },
                  { label: "Approved", val: myApprovedLeaves, color: "text-green-600" },
                  { label: "Pending", val: myPendingLeaves, color: "text-yellow-600" },
                  { label: "Rejected", val: myLeaves.filter(l => l.status.includes("rejected")).length, color: "text-red-600" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between text-sm py-1">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className={`font-bold ${item.color}`}>{item.val}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Profile Image View / Change Modal */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="sm:max-w-md flex flex-col items-center text-center">
          <DialogHeader className="w-full text-center sm:text-center">
            <DialogTitle>{user.name}</DialogTitle>
            <DialogDescription>Profile Photo Preview</DialogDescription>
          </DialogHeader>

          <div className="my-4 flex items-center justify-center w-full max-h-[60vh] overflow-hidden rounded-xl bg-muted/40 p-2 border">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="max-h-[50vh] max-w-full object-contain rounded-lg shadow-sm"
              />
            ) : (
              <Avatar className="h-48 w-48">
                <AvatarFallback className="text-6xl font-bold bg-primary/10 text-primary">
                  {user.name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            )}
          </div>

          <div className="flex justify-center w-full pt-2">
            <label className="cursor-pointer">
              <Button asChild disabled={uploading}>
                <span>
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4 mr-2" />
                  )}
                  {uploading ? "Uploading..." : "Change Image"}
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  handleAvatarChange(e);
                }}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
