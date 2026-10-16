"use client";

import { useMemo, useState } from "react";
import { useAuth, useDB, api } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, Activity, ListChecks, CheckCircle2, TrendingUp, Calendar, Receipt, Wallet, HandCoins, Check } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/dashboard/SharedDashboardComponents";
import { SalesDashboard } from "@/components/dashboard/SalesDashboard";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function formatDuration(seconds?: number) {
  if (!seconds) return "0h 0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function EmployeeDashboard() {
  const user = useAuth();
  const db = useDB();
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const empId = user?.employeeId;
  const myExpenses = useMemo(() => {
    if (!empId) return [];
    return db.expenses.filter((e) => e.employeeId === empId);
  }, [db.expenses, empId]);

  // Unconfirmed Reimbursed Claims (waiting for employee to click "I Received the Money")
  const unconfirmedReimbursed = useMemo(() => {
    return myExpenses.filter((e) => e.status === "reimbursed" && !e.employeeReceived);
  }, [myExpenses]);

  // Cleared Reimbursed Claims (Already confirmed/settled)
  const clearedExpenses = useMemo(() => {
    return myExpenses.filter((e) => e.status === "reimbursed" && e.employeeReceived);
  }, [myExpenses]);

  const pendingHrApprovalClaims = useMemo(() => {
    return myExpenses.filter((e) => e.status === "hr_approved" && !e.employeeAcceptedHr);
  }, [myExpenses]);

  const pendingHrApprovalGrossAmount = useMemo(() => {
    return pendingHrApprovalClaims.reduce((sum, e) => sum + (e.originalAmount != null && e.advanceDeducted ? e.originalAmount : e.amount), 0);
  }, [pendingHrApprovalClaims]);

  const pendingHrApprovalAmount = useMemo(() => {
    return pendingHrApprovalClaims.reduce((sum, e) => sum + e.amount, 0);
  }, [pendingHrApprovalClaims]);

  const pendingHrApprovalAdvanceDeducted = useMemo(() => {
    return pendingHrApprovalClaims.reduce((sum, e) => sum + (e.advanceDeducted || 0), 0);
  }, [pendingHrApprovalClaims]);

  // Pending claims waiting for approval from employee perspective:
  // Once employee accepts HR approval, or Admin approves, it moves out of employee's pending action queue
  const pendingReviewExpenses = useMemo(() => {
    return myExpenses.filter((e) => e.status === "pending" || (e.status === "hr_approved" && !e.employeeAcceptedHr));
  }, [myExpenses]);

  const pendingReimbursedAmount = useMemo(() => {
    return unconfirmedReimbursed.reduce((sum, e) => sum + e.amount, 0);
  }, [unconfirmedReimbursed]);

  const clearedTotalAmount = useMemo(() => {
    return clearedExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [clearedExpenses]);

  const pendingReviewTotalAmount = useMemo(() => {
    return pendingReviewExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [pendingReviewExpenses]);

  // Advance money taken by this employee
  const myAdvances = useMemo(() => {
    if (!empId) return [];
    return (db.advancePayments || []).filter((a) => a.employeeId === empId);
  }, [db.advancePayments, empId]);

  const totalAdvanceTaken = useMemo(() => {
    return myAdvances.reduce((sum, a) => sum + a.amount, 0);
  }, [myAdvances]);

  const clearedAdvanceTaken = useMemo(() => {
    return myAdvances.reduce((sum, a) => sum + (a.settledAmount || (a.status === "settled" ? a.amount : 0)), 0);
  }, [myAdvances]);

  // Active unsettled advance balance
  const activeAdvanceBalance = useMemo(() => {
    return myAdvances
      .filter((a) => a.status === "given" || a.status === "partially_settled")
      .reduce((sum, a) => sum + Math.max(0, a.amount - (a.settledAmount || 0)), 0);
  }, [myAdvances]);

  const [isAcceptingHr, setIsAcceptingHr] = useState(false);

  const handleAcceptHrExpense = async (expenseId: string, amount: number) => {
    setIsAcceptingHr(true);
    try {
      await api.employeeAcceptHrExpense(expenseId);
      toast.success(`You accepted HR's approval for ₹${amount.toLocaleString('en-IN')}. It is deducted from your pending expenses!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to accept HR approval");
    } finally {
      setIsAcceptingHr(false);
    }
  };

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
  const pendingExpenses = myExpenses.filter((e) => e.status === "pending" || e.status === "hr_approved").length;

  const handleConfirmAllReceipts = async () => {
    if (unconfirmedReimbursed.length === 0) return;
    setIsConfirming(true);
    try {
      for (const exp of unconfirmedReimbursed) {
        await api.acknowledgeExpenseReceipt(exp.id);
      }
      toast.success("Payment receipt confirmed! Your pending reimbursement balance is now cleared to ₹0.");
      setShowReceiveModal(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm receipt");
    } finally {
      setIsConfirming(false);
    }
  };

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

      {/* HR Approved Expense Notification Banner (Awaiting Employee Acceptance) */}
      {pendingHrApprovalClaims.length > 0 && (
        <div className="bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-blue-500/15 border-2 border-blue-500/40 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-bounce">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-blue-950 dark:text-blue-100 flex items-center gap-2 text-base">
                HR Approved Your Expense: ₹{pendingHrApprovalGrossAmount.toLocaleString('en-IN')}
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 text-[10px]">
                  {pendingHrApprovalClaims.length} Claim{pendingHrApprovalClaims.length > 1 ? "s" : ""} Approved
                </Badge>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pendingHrApprovalAdvanceDeducted > 0 ? (
                  <>
                    ₹{pendingHrApprovalAdvanceDeducted.toLocaleString('en-IN')} adjusted from advance &bull; Net payout: ₹{pendingHrApprovalAmount.toLocaleString('en-IN')} &bull; Remaining advance: <strong>₹{activeAdvanceBalance.toLocaleString('en-IN')}</strong>. Please accept to proceed.
                  </>
                ) : (
                  <>
                    HR has approved your expense claim. Please confirm and accept it so it can be forwarded to Admin for payout.
                  </>
                )}
              </p>
            </div>
          </div>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md gap-2 shrink-0 w-full md:w-auto"
            onClick={() => setShowReceiveModal(true)}
          >
            <Check className="h-4 w-4" /> Review & Accept Claim{pendingHrApprovalClaims.length > 1 ? "s" : ""}
          </Button>
        </div>
      )}

      {/* Reimbursement Disbursed Notification Banner */}
      {unconfirmedReimbursed.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border-2 border-emerald-500/40 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-2 text-base">
                Reimbursement Disbursed: ₹{pendingReimbursedAmount.toLocaleString('en-IN')}
                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                  {unconfirmedReimbursed.length} Claim{unconfirmedReimbursed.length > 1 ? "s" : ""} Paid
                </Badge>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                HR and Admin have approved and paid your expense claims. Did you receive this money into your account?
              </p>
            </div>
          </div>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md gap-2 shrink-0 w-full md:w-auto animate-pulse"
            onClick={() => setShowReceiveModal(true)}
          >
            <HandCoins className="h-4 w-4" /> I Received the Money
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Login" value={todayAtt?.firstLoginAt ? new Date(todayAtt.firstLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : todayAtt?.loginTime || "—"} icon={Clock} tone="info" trend={activeSession ? "Currently Active" : (todayAtt ? "Logged Out" : "Not Logged In")} />
        <StatCard label="Working Hours" value={totalWorkingSecs > 0 ? formatDuration(totalWorkingSecs) : `${todayAtt?.workingHours || 0}h`} icon={Activity} tone="primary" />
        <StatCard label="Pending Tasks" value={pendingTasks} icon={ListChecks} tone="warning" />
        <StatCard label="Completed Tasks" value={completedTasks} icon={CheckCircle2} tone="success" />
        <StatCard label="Pending Expenses" value={pendingExpenses} icon={Receipt} tone="info" />
        <StatCard label="Unread Notifications" value={unreadNotifs} icon={Activity} tone="destructive" />
      </div>

      {user.jobRole === "Sales" && (
        <SalesDashboard />
      )}

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

        {/* MY EXPENSES & ADVANCES */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My Expenses & Advances</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={() => setShowReceiveModal(true)}
              >
                <Receipt className="h-3.5 w-3.5" /> View Status & Claims
              </Button>
              {pendingReimbursedAmount > 0 ? (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 animate-pulse text-xs">
                  ₹{pendingReimbursedAmount.toLocaleString('en-IN')} Paid (Confirm Receipt)
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">
                  All Cleared (₹0 Pending)
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`grid grid-cols-2 ${totalAdvanceTaken > 0 ? "md:grid-cols-5" : "md:grid-cols-4"} gap-2 mb-2`}>
              <div className="bg-muted p-3 rounded-lg text-center">
                <div className="text-2xl font-bold">₹{myExpenses.filter(e => e.status === "pending").reduce((a,b)=>a+b.amount,0).toLocaleString('en-IN')}</div>
                <div className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Pending HR</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold">₹{pendingHrApprovalAmount.toLocaleString('en-IN')}</div>
                <div className="text-[10px] uppercase font-semibold tracking-wider">HR Approved (Accept)</div>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold">₹{myExpenses.filter(e => e.status === "admin_approved" || (e.status === "hr_approved" && e.employeeAcceptedHr)).reduce((a,b)=>a+b.amount,0).toLocaleString('en-IN')}</div>
                <div className="text-[10px] uppercase font-semibold tracking-wider">Approved (In Pipeline)</div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold">₹{pendingReimbursedAmount.toLocaleString('en-IN')}</div>
                <div className="text-[10px] uppercase font-semibold tracking-wider">
                  {pendingReimbursedAmount === 0 ? "Reimbursed (Settled)" : "Disbursed (Unclaimed)"}
                </div>
              </div>
              {totalAdvanceTaken > 0 && (
                <div className={cn(
                  "p-3 rounded-lg text-center border animate-in fade-in",
                  activeAdvanceBalance > 0
                    ? "bg-purple-50 dark:bg-purple-950/20 text-purple-700 border-purple-200 dark:border-purple-800"
                    : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 border-emerald-200 dark:border-emerald-800"
                )}>
                  <div className="text-2xl font-bold">
                    {activeAdvanceBalance > 0 ? `₹${activeAdvanceBalance.toLocaleString('en-IN')}` : "All Cleared"}
                  </div>
                  <div className="text-[10px] uppercase font-semibold tracking-wider">
                    {activeAdvanceBalance > 0 ? "Advance Remaining" : "Advance Cleared"}
                  </div>
                </div>
              )}
            </div>

            {activeAdvanceBalance > 0 && (
              <div className="mt-3 p-2.5 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg flex items-center justify-between text-xs text-purple-900 dark:text-purple-200">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-purple-600 shrink-0" />
                  <span>
                    <strong>Outstanding Advance:</strong> ₹{activeAdvanceBalance.toLocaleString('en-IN')} remaining{clearedAdvanceTaken > 0 ? ` (₹${clearedAdvanceTaken.toLocaleString('en-IN')} already adjusted)` : ""}. Will be deducted from upcoming claims.
                  </span>
                </div>
                <span className="font-mono text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                  {myAdvances[0]?.disbursedDate ? `Disbursed: ${myAdvances[0].disbursedDate}` : ""}
                </span>
              </div>
            )}

            {activeAdvanceBalance === 0 && totalAdvanceTaken > 0 && (
              <div className="mt-3 p-2 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-800/40 rounded-lg flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Advance Cleared:</strong> All prior advances (₹{totalAdvanceTaken.toLocaleString('en-IN')}) have been fully cleared & adjusted against claims.
                  </span>
                </div>
                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] py-0 font-bold">
                  All Cleared (₹0 Remaining)
                </Badge>
              </div>
            )}

            {pendingReimbursedAmount > 0 && (
              <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-xs text-emerald-900 dark:text-emerald-200">
                  <span className="font-bold">Payment Released:</span> You have ₹{pendingReimbursedAmount.toLocaleString('en-IN')} in approved reimbursements. Click below once received to clear your balance.
                </div>
                <Button 
                  size="sm" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8 shrink-0 shadow-sm"
                  onClick={() => setShowReceiveModal(true)}
                >
                  <HandCoins className="h-3.5 w-3.5 mr-1" /> View & Clear Reimbursement
                </Button>
              </div>
            )}

            {pendingReimbursedAmount === 0 && clearedExpenses.length > 0 && (
              <div className="mt-3 text-xs text-muted-foreground flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>All approved reimbursement payments acknowledged and cleared (₹{clearedTotalAmount.toLocaleString('en-IN')} total cleared).</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(true)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  View Summary
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal: Cleared & Pending Expenses Overview */}
      <Dialog open={showReceiveModal} onOpenChange={setShowReceiveModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-bold text-lg">
              <Receipt className="h-5 w-5" /> Expense Claims Status & Settlement
            </DialogTitle>
            <DialogDescription>
              View your cleared reimbursed expenses alongside currently pending claims and acknowledge receipt of newly disbursed funds.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Top Summary Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded-lg p-3 text-center">
                <p className="text-[11px] text-emerald-800 dark:text-emerald-200 uppercase font-bold tracking-wider">Cleared & Settled</p>
                <h3 className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">₹{clearedTotalAmount.toLocaleString('en-IN')}</h3>
                <p className="text-[10px] text-muted-foreground">{clearedExpenses.length} claim(s)</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-lg p-3 text-center">
                <p className="text-[11px] text-amber-800 dark:text-amber-200 uppercase font-bold tracking-wider">Pending Review</p>
                <h3 className="text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5">₹{pendingReviewTotalAmount.toLocaleString('en-IN')}</h3>
                <p className="text-[10px] text-muted-foreground">{pendingReviewExpenses.length} claim(s)</p>
              </div>
              <div className={cn(
                "border rounded-lg p-3 text-center",
                activeAdvanceBalance > 0
                  ? "bg-purple-50 dark:bg-purple-950/30 border-purple-200"
                  : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200"
              )}>
                <p className={cn(
                  "text-[11px] uppercase font-bold tracking-wider",
                  activeAdvanceBalance > 0
                    ? "text-purple-800 dark:text-purple-200"
                    : "text-emerald-800 dark:text-emerald-200"
                )}>
                  {activeAdvanceBalance > 0 ? "Active Advance" : "Advance Cleared"}
                </p>
                <h3 className={cn(
                  "text-xl font-black mt-0.5",
                  activeAdvanceBalance > 0
                    ? "text-purple-700 dark:text-purple-300"
                    : "text-emerald-700 dark:text-emerald-300"
                )}>
                  {activeAdvanceBalance > 0
                    ? `₹${activeAdvanceBalance.toLocaleString('en-IN')}`
                    : (totalAdvanceTaken > 0 ? "All Cleared" : "₹0")}
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  {activeAdvanceBalance > 0
                    ? `${myAdvances.filter(a => a.status !== "settled").length} pending deduction`
                    : totalAdvanceTaken > 0
                    ? `All ₹${totalAdvanceTaken.toLocaleString('en-IN')} cleared & settled`
                    : "No advance taken"}
                </p>
              </div>
            </div>

            {/* Awaiting HR Approval Acceptance by Employee */}
            {pendingHrApprovalClaims.length > 0 && (
              <div className="p-3 bg-blue-50/80 dark:bg-blue-950/30 border-2 border-blue-500 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" /> HR Approved Claims (Please Accept)
                  </h4>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 font-bold">
                    ₹{pendingHrApprovalAmount.toLocaleString('en-IN')}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  HR has approved these claims. Accepting them will minus them from your pending claims and submit them to Admin for payout:
                </p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {pendingHrApprovalClaims.map((exp) => (
                    <div key={exp.id} className="p-2.5 rounded bg-white dark:bg-card border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold">{exp.title}</span>
                        <div className="text-[11px] text-muted-foreground">{exp.id} &bull; {exp.expenseDate} &bull; {exp.category}</div>
                        {exp.hrReviewComment && (
                          <div className="text-[11px] text-blue-700 dark:text-blue-300 italic mt-0.5">HR: &quot;{exp.hrReviewComment}&quot;</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 justify-between sm:justify-end shrink-0">
                        <div className="text-right">
                          <div className="font-bold text-sm text-foreground">
                            ₹{(exp.originalAmount != null && exp.advanceDeducted ? exp.originalAmount : exp.amount).toLocaleString('en-IN')}
                          </div>
                          {exp.advanceDeducted != null && exp.advanceDeducted > 0 && (
                            <div className="text-[10px] text-purple-600 dark:text-purple-400">
                              -₹{exp.advanceDeducted.toLocaleString('en-IN')} adv (Net: ₹{exp.amount.toLocaleString('en-IN')})
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium"
                          onClick={() => handleAcceptHrExpense(exp.id, exp.amount)}
                          disabled={isAcceptingHr}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Accept Approval
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Awaiting Confirmation (If Any) */}
            {unconfirmedReimbursed.length > 0 && (
              <div className="p-3 bg-emerald-50/80 border-2 border-emerald-500 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                    <HandCoins className="h-4 w-4 text-emerald-600" /> Payment Disbursed by HR/Admin (Ready to Clear)
                  </h4>
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold">
                    ₹{pendingReimbursedAmount.toLocaleString('en-IN')}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  The following claims have been disbursed by Admin/HR. Please confirm once the money is in your account:
                </p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {unconfirmedReimbursed.map((exp) => (
                    <div key={exp.id} className="p-2 rounded bg-white dark:bg-card border text-xs flex justify-between items-center">
                      <div>
                        <span className="font-semibold">{exp.title}</span>
                        <div className="text-[11px] text-muted-foreground">{exp.id} &bull; {exp.expenseDate} &bull; {exp.category}</div>
                      </div>
                      <span className="font-bold text-emerald-700">₹{exp.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-1 flex justify-end">
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold text-xs h-8"
                    onClick={handleConfirmAllReceipts}
                    disabled={isConfirming}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {isConfirming ? "Clearing..." : "I Received the Money (Clear Balance)"}
                  </Button>
                </div>
              </div>
            )}

            {/* Cleared Expenses Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b pb-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Cleared Expenses ({clearedExpenses.length})
                </h4>
                <span className="text-xs font-semibold text-emerald-700">Total: ₹{clearedTotalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {clearedExpenses.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2 text-center">No cleared expenses yet.</p>
                ) : (
                  clearedExpenses.map((exp) => (
                    <div key={exp.id} className="p-2 rounded border bg-emerald-50/30 dark:bg-emerald-950/10 text-xs flex justify-between items-center">
                      <div>
                        <div className="font-medium text-foreground">{exp.title}</div>
                        <div className="text-[11px] text-muted-foreground">{exp.id} &bull; {exp.expenseDate} &bull; {exp.category}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-700 dark:text-emerald-400">₹{exp.amount.toLocaleString('en-IN')}</div>
                        <span className="text-[10px] text-emerald-600 font-medium">Cleared</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pending Expenses Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b pb-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> Pending Expense Claims ({pendingReviewExpenses.length})
                </h4>
                <span className="text-xs font-semibold text-amber-700">Total: ₹{pendingReviewTotalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {pendingReviewExpenses.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2 text-center">No pending expense claims currently.</p>
                ) : (
                  pendingReviewExpenses.map((exp) => (
                    <div key={exp.id} className="p-2 rounded border bg-muted/30 text-xs flex justify-between items-center">
                      <div>
                        <div className="font-medium text-foreground">{exp.title}</div>
                        <div className="text-[11px] text-muted-foreground">{exp.id} &bull; {exp.expenseDate} &bull; {exp.category}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">₹{exp.amount.toLocaleString('en-IN')}</div>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {exp.status === "pending" ? "Pending HR" : exp.status === "hr_approved" ? "Pending Admin" : "Approved"}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Advance History & Deductions */}
            {myAdvances.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b pb-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                    <Wallet className="h-4 w-4" /> Advance Disbursements & Settlement ({myAdvances.length})
                  </h4>
                  <span className="text-xs font-semibold text-purple-700">
                    Remaining: ₹{activeAdvanceBalance.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {myAdvances.map((adv) => {
                    const settled = adv.settledAmount || 0;
                    const remaining = Math.max(0, adv.amount - settled);
                    return (
                      <div key={adv.id} className="p-2 rounded border bg-purple-50/30 dark:bg-purple-950/10 text-xs flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            {adv.reason || "Advance Money"}
                            <Badge variant="outline" className={`text-[10px] py-0 ${remaining === 0 ? "border-emerald-400 text-emerald-700 bg-emerald-50" : "border-purple-400 text-purple-700 bg-purple-50"}`}>
                              {remaining === 0 ? "Fully Cleared" : settled > 0 ? "Partially Cleared" : "Active"}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {adv.id} &bull; Disbursed: {adv.disbursedDate} &bull; Mode: {adv.paymentMode || "Cash"}
                            {adv.settledExpenseId && ` • Settled in ${adv.settledExpenseId}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-purple-700 dark:text-purple-300">₹{adv.amount.toLocaleString('en-IN')}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {remaining === 0 ? "Cleared (₹0 left)" : `₹${settled.toLocaleString('en-IN')} deducted`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiveModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
