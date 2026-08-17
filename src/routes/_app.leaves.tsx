import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth, useDB, api } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Check, X } from "lucide-react";
import { StatusBadge } from "./_app.dashboard";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/_app/leaves")({
  component: LeavesPage,
});

function LeavesPage() {
  const user = useAuth();
  const db = useDB();
  const [open, setOpen] = useState(false);
  const isApprover = user?.role === "admin";

  const leaves = isApprover
    ? db.leaves
    : db.leaves.filter((l) => l.employeeId === user?.employeeId);

  return (
    <div>
      <PageHeader title="Leaves" description={isApprover ? "Manage leave requests" : "Your leave history"}
        actions={user?.role === "employee" ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Apply Leave</Button></DialogTrigger>
            <ApplyLeaveDialog onClose={() => setOpen(false)} />
          </Dialog>
        ) : null}
      />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 md:p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {isApprover && <TableHead>Employee</TableHead>}
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  {isApprover && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.map((l) => {
                  const emp = db.employees.find((e) => e.id === l.employeeId);
                  return (
                    <TableRow key={l.id}>
                      {isApprover && emp && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7"><AvatarImage src={emp.avatar} /><AvatarFallback>{emp.name[0]}</AvatarFallback></Avatar>
                            <span className="text-sm">{emp.name}</span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>{l.type}</TableCell>
                      <TableCell>{l.startDate}</TableCell>
                      <TableCell>{l.endDate}</TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">{l.reason}</TableCell>
                      <TableCell><StatusBadge status={l.status} /></TableCell>
                      {isApprover && (
                        <TableCell className="text-right">
                          {l.status === "Pending" && (
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" className="text-success" onClick={() => { api.updateLeave(l.id, { status: "Approved" }); toast.success("Approved"); }}><Check className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { api.updateLeave(l.id, { status: "Rejected" }); toast.success("Rejected"); }}><X className="h-4 w-4" /></Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {leaves.length === 0 && <TableRow><TableCell colSpan={isApprover ? 7 : 5} className="text-center py-10 text-muted-foreground">No leave records.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ApplyLeaveDialog({ onClose }: { onClose: () => void }) {
  const user = useAuth();
  const [form, setForm] = useState({
    type: "Casual" as const,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    reason: "",
  });
  function submit() {
    if (!user?.employeeId) return;
    api.addLeave({ ...form, employeeId: user.employeeId });
    toast.success("Leave applied");
    onClose();
  }
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label>Type</Label>
          <Select value={form.type} onValueChange={(v) => setForm({...form, type: v as typeof form.type})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Casual">Casual</SelectItem><SelectItem value="Sick">Sick</SelectItem>
              <SelectItem value="Earned">Earned</SelectItem><SelectItem value="Unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({...form, startDate: e.target.value})} /></div>
          <div className="space-y-1"><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({...form, endDate: e.target.value})} /></div>
        </div>
        <div className="space-y-1"><Label>Reason</Label><Textarea value={form.reason} onChange={(e) => setForm({...form, reason: e.target.value})} /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit}>Submit</Button></DialogFooter>
    </DialogContent>
  );
}
