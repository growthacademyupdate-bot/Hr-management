"use client";

import { useState } from "react";
import { useAuth, useDB, api } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function SalesReportsPage() {
  const user = useAuth();
  const db = useDB();
  const [isAddOpen, setIsAddOpen] = useState(false);

  if (!user || (user.role === "employee" && user.jobRole !== "Sales")) return <div className="p-6">Unauthorized</div>;

  const today = format(new Date(), "yyyy-MM-dd");
  
  // Sales sees their own, Admin sees all
  const myReports = db.dailyReports?.filter(r => 
    user.role === "admin" || r.employeeId === (user.employeeId || user.id)
  ) || [];
  
  // Since we share the DailyReport model, we filter to show only Sales reports
  const salesReports = myReports.filter(r => r.jobRole === "Sales");

  const hasSubmittedToday = salesReports.some(r => r.reportDate === today && r.employeeId === (user.employeeId || user.id));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Reports</h1>
          <p className="text-muted-foreground">Submit and view daily sales KPIs</p>
        </div>
        {user.role === "employee" && (
          <Button onClick={() => setIsAddOpen(true)} disabled={hasSubmittedToday}>
            <Plus className="h-4 w-4 mr-2" />
            {hasSubmittedToday ? "Submitted for Today" : "Submit Today's Report"}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  {user.role === "admin" && <TableHead>Employee</TableHead>}
                  <TableHead>New Leads</TableHead>
                  <TableHead>Follow-Ups</TableHead>
                  <TableHead>Meetings</TableHead>
                  <TableHead>Positive</TableHead>
                  {user.role === "admin" && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {report.reportDate}
                    </TableCell>
                    {user.role === "admin" && (
                      <TableCell>{report.employeeName}</TableCell>
                    )}
                    <TableCell>{report.newLeads || 0}</TableCell>
                    <TableCell>{report.followUps || 0}</TableCell>
                    <TableCell>{report.meetings || 0}</TableCell>
                    <TableCell>{report.positiveCustomers || 0}</TableCell>
                    {user.role === "admin" && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={async () => {
                          if (confirm("Delete this report?")) {
                            await api.deleteDailyReport(report.id);
                            toast.success("Report deleted");
                          }
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {salesReports.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={user.role === "admin" ? 7 : 5} className="text-center py-8 text-muted-foreground">
                      No sales reports found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {isAddOpen && <AddSalesReportDialog onClose={() => setIsAddOpen(false)} user={user} db={db} />}
    </div>
  );
}

function AddSalesReportDialog({ onClose, user, db }: { onClose: () => void, user: any, db: any }) {
  const [form, setForm] = useState({
    newLeads: 0,
    followUps: 0,
    interestedCustomers: 0,
    positiveCustomers: 0,
    convertedCustomers: 0,
    callsMade: 0,
    meetings: 0,
    additionalNotes: ""
  });

  async function submit() {
    try {
      const dbEmp = db.employees?.find((e: any) => e.id === (user.employeeId || user.id));
      const todayDate = new Date();
      const reportDate = format(todayDate, "yyyy-MM-dd");
      const reportDay = format(todayDate, "EEEE");

      await api.addDailyReport({
        ...form,
        reportDate,
        reportDay,
        employeeId: user.employeeId || user.id,
        jobRole: "Sales",
        employeeName: user.name,
        designation: dbEmp?.designation || "Sales Employee"
      });
      toast.success("Sales report submitted successfully");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit report");
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit Today's Sales Report</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>New Leads Created</Label>
            <Input type="number" value={form.newLeads} onChange={e => setForm({...form, newLeads: +e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Follow-ups Done</Label>
            <Input type="number" value={form.followUps} onChange={e => setForm({...form, followUps: +e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Calls Made</Label>
            <Input type="number" value={form.callsMade} onChange={e => setForm({...form, callsMade: +e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Meetings Conducted</Label>
            <Input type="number" value={form.meetings} onChange={e => setForm({...form, meetings: +e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Interested Customers</Label>
            <Input type="number" value={form.interestedCustomers} onChange={e => setForm({...form, interestedCustomers: +e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Positive Customers</Label>
            <Input type="number" value={form.positiveCustomers} onChange={e => setForm({...form, positiveCustomers: +e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Converted Customers</Label>
            <Input type="number" value={form.convertedCustomers} onChange={e => setForm({...form, convertedCustomers: +e.target.value})} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Additional Notes</Label>
            <Input value={form.additionalNotes} onChange={e => setForm({...form, additionalNotes: e.target.value})} placeholder="Summary of the day..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Submit Report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
