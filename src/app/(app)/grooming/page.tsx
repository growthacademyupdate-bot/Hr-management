"use client";

import { useState, useMemo } from "react";
import { useAuth, useDB, api } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Eye, CheckSquare, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const GROOMING_POINTS = [
  "Clean & well-ironed uniform/formal dress",
  "Hair properly combed and neat",
  "Beard clean/trimmed or properly shaved",
  "Nails clean and properly trimmed",
  "Shoes clean and polished",
  "Socks clean and appropriate",
  "Fresh breath & proper oral hygiene",
  "Personal hygiene/body odour properly maintained",
  "ID card/office accessories properly worn",
  "Overall appearance neat & professional",
  "Minimal and professional use of perfume/deodorant",
  "Professional body language & posture",
  "Mobile phone kept appropriately during working hours",
  "Punctuality & readiness at start of shift",
  "Polite and professional communication"
];

export default function GroomingPage() {
  const user = useAuth();
  const db = useDB();
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  const canManage = user?.role === "admin" || user?.role === "hr";

  const groomingRecords = useMemo(() => {
    if (canManage) return db.grooming;
    return db.grooming.filter(g => g.employeeId === user?.employeeId);
  }, [db.grooming, user, canManage]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Grooming"
        description="Daily grooming checklists and reviews"
        actions={canManage ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> New Grooming Review</Button>
            </DialogTrigger>
            <AddGroomingDialog onClose={() => setOpen(false)} />
          </Dialog>
        ) : null}
      />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Checked By</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groomingRecords.map((g) => {
                  const emp = db.employees.find(e => e.id === g.employeeId);
                  return (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{new Date(g.date).toLocaleDateString()}</TableCell>
                      <TableCell>{emp?.name || g.employeeId}</TableCell>
                      <TableCell>{emp?.department || "N/A"}</TableCell>
                      <TableCell>{g.checkedBy}</TableCell>
                      <TableCell className="font-bold">{g.score} / {g.totalPoints}</TableCell>
                      <TableCell>
                        <Badge variant={g.status === "Excellent" ? "default" : g.status === "Good" ? "secondary" : "destructive"}>
                          {g.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedRecord(g); setViewOpen(true); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canManage && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive"
                              onClick={async () => {
                                if (confirm("Are you sure you want to delete this grooming record?")) {
                                  try {
                                    await api.deleteGrooming(g.id);
                                    toast.success("Grooming record deleted");
                                  } catch (e: any) {
                                    toast.error(e.message || "Failed to delete");
                                  }
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {groomingRecords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No grooming records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedRecord && (
        <ViewGroomingDialog record={selectedRecord} open={viewOpen} onClose={() => { setViewOpen(false); setSelectedRecord(null); }} />
      )}
    </div>
  );
}

function AddGroomingDialog({ onClose }: { onClose: () => void }) {
  const db = useDB();
  const user = useAuth();
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<{ isYes: boolean; remarks: string }[]>(
    GROOMING_POINTS.map(() => ({ isYes: true, remarks: "" }))
  );

  const selectedEmp = db.employees.find(e => e.id === employeeId);
  const score = items.filter(i => i.isYes).length;
  const status = score >= 13 ? "Excellent" : score >= 10 ? "Good" : "Needs Improvement";

  async function handleSubmit() {
    if (!employeeId) return toast.error("Select an employee");
    if (!user) return;

    try {
      await api.addGrooming({
        employeeId,
        date,
        checkedBy: user.name,
        score,
        totalPoints: 15,
        status,
        items: items.map((i, idx) => ({
          pointId: idx + 1,
          question: GROOMING_POINTS[idx],
          isYes: i.isYes,
          remarks: i.remarks
        }))
      });
      toast.success("Grooming review submitted");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    }
  }

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Daily Employee Grooming Checklist</DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-1">
          <Label>Employee</Label>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
            <SelectContent>
              {db.employees.filter(e => e.status === "Active").map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name} ({e.department})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-12 gap-2 text-sm font-semibold border-b pb-2">
          <div className="col-span-1">Sr.</div>
          <div className="col-span-5">Grooming Point</div>
          <div className="col-span-2 text-center">Yes / No</div>
          <div className="col-span-4">Remarks</div>
        </div>
        
        {GROOMING_POINTS.map((point, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center py-2 border-b last:border-0">
            <div className="col-span-1 text-sm text-muted-foreground">{i + 1}</div>
            <div className="col-span-5 text-sm">{point}</div>
            <div className="col-span-2 flex justify-center">
              <Checkbox 
                checked={items[i].isYes} 
                onCheckedChange={(c) => {
                  const newItems = [...items];
                  newItems[i].isYes = !!c;
                  setItems(newItems);
                }} 
              />
            </div>
            <div className="col-span-4">
              <Input 
                size={1} 
                className="h-8 text-sm" 
                placeholder="Remarks (optional)" 
                value={items[i].remarks}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[i].remarks = e.target.value;
                  setItems(newItems);
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-6 p-4 bg-muted/50 rounded-lg border">
        <div>
          <p className="text-sm text-muted-foreground">Checked By</p>
          <p className="font-semibold">{user?.name}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Score</p>
          <p className="text-xl font-bold text-primary">{score} / 15</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Overall Status</p>
          <Badge variant={status === "Excellent" ? "default" : status === "Good" ? "secondary" : "destructive"}>
            {status}
          </Badge>
        </div>
      </div>

      <DialogFooter className="mt-6">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit}>Submit Review</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ViewGroomingDialog({ record, open, onClose }: { record: any, open: boolean, onClose: () => void }) {
  const db = useDB();
  const emp = db.employees.find(e => e.id === record.employeeId);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            Grooming Review Report
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/30 rounded-lg border">
          <div>
            <p className="text-xs text-muted-foreground uppercase">Employee</p>
            <p className="font-semibold">{emp?.name || record.employeeId}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Department</p>
            <p className="font-semibold">{emp?.department || "N/A"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Date</p>
            <p className="font-semibold">{new Date(record.date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Checked By</p>
            <p className="font-semibold">{record.checkedBy}</p>
          </div>
        </div>

        <div className="space-y-0 border rounded-md overflow-hidden">
          <div className="grid grid-cols-12 gap-2 text-sm font-semibold bg-muted p-3">
            <div className="col-span-1">Sr.</div>
            <div className="col-span-6">Grooming Point</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-3">Remarks</div>
          </div>
          
          {record.items.map((item: any, i: number) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center p-3 border-t">
              <div className="col-span-1 text-sm text-muted-foreground">{item.pointId}</div>
              <div className="col-span-6 text-sm">{item.question}</div>
              <div className="col-span-2 flex justify-center">
                {item.isYes ? (
                  <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200">Yes</Badge>
                ) : (
                  <Badge variant="destructive" className="bg-red-500/10 text-red-700 hover:bg-red-500/20 border-red-200">No</Badge>
                )}
              </div>
              <div className="col-span-3 text-sm text-muted-foreground truncate" title={item.remarks}>
                {item.remarks || "—"}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-6 items-center mt-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Score</p>
            <p className="text-2xl font-bold text-primary">{record.score} / {record.totalPoints}</p>
          </div>
          <div className="w-px h-10 bg-border"></div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Overall Status</p>
            <Badge className="text-sm" variant={record.status === "Excellent" ? "default" : record.status === "Good" ? "secondary" : "destructive"}>
              {record.status}
            </Badge>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
