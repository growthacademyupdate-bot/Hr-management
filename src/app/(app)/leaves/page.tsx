"use client";

import { useState } from "react";
import { useAuth, useDB, api, useGlobalSearch } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function LeaveStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "pending": "bg-warning/15 text-warning border-warning/20",
    "hr_approved": "bg-info/15 text-info border-info/20",
    "hr_rejected": "bg-destructive/15 text-destructive border-destructive/20",
    "admin_approved": "bg-success/15 text-success border-success/20",
    "admin_rejected": "bg-destructive/15 text-destructive border-destructive/20",
    "cancelled": "bg-muted text-muted-foreground border-border",
  };
  const labelMap: Record<string, string> = {
    "pending": "Pending",
    "hr_approved": "HR Approved",
    "hr_rejected": "HR Rejected",
    "admin_approved": "Admin Approved",
    "admin_rejected": "Admin Rejected",
    "cancelled": "Cancelled",
  };
  return <Badge variant="outline" className={map[status] || ""}>{labelMap[status] || status}</Badge>;
}

export default function LeavesPage() {
  const user = useAuth();
  const db = useDB();
  const globalSearch = useGlobalSearch().toLowerCase();

  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  
  if (!user) return null;

  let visibleLeaves = db.leaves;
  if (globalSearch) {
    visibleLeaves = visibleLeaves.filter((l) => 
      l.type?.toLowerCase().includes(globalSearch) ||
      l.status.toLowerCase().includes(globalSearch) ||
      db.employees.find(e => e.id === l.employeeId)?.name?.toLowerCase().includes(globalSearch)
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader title="Leave Management" description="Manage and track employee leave requests." />
        
        {user.role === "employee" && (
          <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
            <DialogTrigger asChild>
              <Button>Apply Leave</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Apply for Leave</DialogTitle>
              </DialogHeader>
              <ApplyLeaveForm onSuccess={() => setIsApplyOpen(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {user.role !== "employee" && <TableHead>Employee</TableHead>}
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleLeaves.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No leave requests found.
                  </TableCell>
                </TableRow>
              )}
              {visibleLeaves.map((leave) => {
                const assignedEmp = db.employees.find((e) => e.id === leave.employeeId);
                
                return (
                  <TableRow key={leave.id}>
                    {user.role !== "employee" && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={assignedEmp?.avatar} />
                            <AvatarFallback>{assignedEmp?.name?.[0] || "?"}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{assignedEmp?.name || "Unknown"}</span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="font-medium">{leave.type}</div>
                      <div className="text-xs text-muted-foreground">Applied: {leave.appliedAt.slice(0, 10)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm whitespace-nowrap">
                        <div><span className="text-muted-foreground">From:</span> {leave.startDate}</div>
                        <div><span className="text-muted-foreground">To:</span> {leave.endDate}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{leave.numberOfDays}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm max-w-[200px] truncate" title={leave.reason}>{leave.reason}</div>
                    </TableCell>
                    <TableCell>
                      <LeaveStatusBadge status={leave.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {user.role === "employee" && leave.status === "pending" && (
                          <Button size="sm" variant="destructive" onClick={async () => {
                            if (confirm("Are you sure you want to cancel this leave?")) {
                              await api.cancelLeave(leave.id);
                              toast.success("Leave cancelled");
                            }
                          }}>
                            Cancel
                          </Button>
                        )}
                        
                        {user.role === "hr" && leave.status === "pending" && (
                          <Button size="sm" variant="default" onClick={() => { setSelectedLeave(leave); setIsReviewOpen(true); }}>
                            Review
                          </Button>
                        )}

                        {user.role === "admin" && leave.status === "hr_approved" && (
                          <Button size="sm" variant="default" onClick={() => { setSelectedLeave(leave); setIsReviewOpen(true); }}>
                            Final Review
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Leave Request</DialogTitle>
          </DialogHeader>
          <ReviewLeaveForm leave={selectedLeave} userRole={user.role} onSuccess={() => setIsReviewOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApplyLeaveForm({ onSuccess }: { onSuccess: () => void }) {
  const [type, setType] = useState("Casual Leave");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !startDate || !endDate || !reason) {
      toast.error("Please fill all required fields");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      toast.error("To Date cannot be before From Date");
      return;
    }
    try {
      await api.addLeave({
        type,
        startDate,
        endDate,
        reason,
      });
      toast.success("Leave request submitted successfully");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit leave");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Leave Type</Label>
        <Select value={type} onValueChange={setType} required>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Casual Leave">Casual Leave</SelectItem>
            <SelectItem value="Sick Leave">Sick Leave</SelectItem>
            <SelectItem value="Earned Leave">Earned Leave</SelectItem>
            <SelectItem value="Emergency Leave">Emergency Leave</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>From Date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>To Date</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Reason</Label>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Please provide a reason..." required />
      </div>
      <DialogFooter className="pt-4">
        <Button type="submit" className="w-full">Submit Request</Button>
      </DialogFooter>
    </form>
  );
}

function ReviewLeaveForm({ leave, userRole, onSuccess }: { leave: any; userRole: string; onSuccess: () => void }) {
  const [comment, setComment] = useState("");
  const db = useDB();

  if (!leave) return null;
  const emp = db.employees.find(e => e.id === leave.employeeId);

  const handleAction = async (action: "approve" | "reject") => {
    if (action === "reject" && !comment) {
      toast.error("Rejection reason is required");
      return;
    }
    try {
      if (userRole === "hr") {
        await api.hrReviewLeave(leave.id, action, comment);
      } else if (userRole === "admin") {
        await api.adminReviewLeave(leave.id, action, comment);
      }
      toast.success(`Leave request ${action}d successfully`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="bg-muted/30 p-4 rounded-lg space-y-3">
        <div>
          <div className="text-xs text-muted-foreground">Employee</div>
          <div className="font-medium">{emp?.name || leave.employeeId}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-muted-foreground">Type</div>
            <div className="font-medium">{leave.type}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Days</div>
            <div className="font-medium">{leave.numberOfDays}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-muted-foreground">From</div>
            <div className="font-medium">{leave.startDate}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">To</div>
            <div className="font-medium">{leave.endDate}</div>
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Reason</div>
          <div className="text-sm mt-1 p-2 bg-background border rounded-md">{leave.reason}</div>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <Label>Review Comment {<span className="text-muted-foreground text-xs font-normal">(Required for rejection)</span>}</Label>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Add a comment..." />
      </div>
      
      <div className="flex gap-3 pt-4">
        <Button className="flex-1" variant="outline" onClick={() => handleAction("reject")}>Reject</Button>
        <Button className="flex-1" onClick={() => handleAction("approve")}>Approve</Button>
      </div>
    </div>
  );
}
