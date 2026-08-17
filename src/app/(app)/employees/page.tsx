"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth, useDB, api } from "@/lib/store";
import type { Employee } from "@/lib/mock-data";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "../dashboard/page";
import { toast } from "sonner";

const DEPARTMENTS = ["Design", "Marketing", "Sales", "HR", "Web", "Finance", "Operations"];

export default function EmployeesPage() {
  const user = useAuth();
  const db = useDB();
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const canManage = user?.role === "admin" || user?.role === "hr";

  const list = db.employees.filter((e) => {
    if (q && !`${e.name} ${e.id} ${e.email}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (dept !== "all" && e.department !== dept) return false;
    if (status !== "all" && e.status !== status) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Employees"
        description={`${db.employees.length} total employees`}
        actions={canManage ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Employee</Button></DialogTrigger>
            <AddEmployeeDialog onClose={() => setOpen(false)} />
          </Dialog>
        ) : null}
      />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search employees…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="On Leave">On Leave</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Joining Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9"><AvatarImage src={e.avatar} /><AvatarFallback>{e.name[0]}</AvatarFallback></Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{e.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{e.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{e.department}</TableCell>
                    <TableCell className="text-muted-foreground">{e.designation}</TableCell>
                    <TableCell className="text-muted-foreground">{e.mobile}</TableCell>
                    <TableCell className="text-muted-foreground">{e.joiningDate}</TableCell>
                    <TableCell><StatusBadge status={e.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="icon"><Link href={`/employees/${e.id}`}><Eye className="h-4 w-4" /></Link></Button>
                        {canManage && <>
                          <Button variant="ghost" size="icon" onClick={() => { setEditingEmp(e); setEditOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { api.deleteEmployee(e.id); toast.success("Employee deleted"); }}><Trash2 className="h-4 w-4" /></Button>
                        </>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {list.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No employees match your filters.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {editingEmp && <EditEmployeeDialog employee={editingEmp} open={editOpen} onClose={() => { setEditOpen(false); setEditingEmp(null); }} />}
    </div>
  );
}

function AddEmployeeDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: "", email: "", mobile: "", department: "Engineering", designation: "", joiningDate: new Date().toISOString().slice(0,10), salary: 60000, password: "tushar123",
  });
  function submit() {
    if (!form.name || !form.email) { toast.error("Name and email are required"); return; }
    const newEmp = api.addEmployee({ ...form, status: "Active" });
    toast.success(`Employee added! ID: ${newEmp.id}`);
    onClose();
  }
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Add New Employee</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1"><Label>Full Name</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
        <div className="space-y-1"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></div>
        <div className="space-y-1"><Label>Mobile</Label><Input value={form.mobile} onChange={(e) => setForm({...form, mobile: e.target.value})} /></div>
        <div className="space-y-1">
          <Label>Department</Label>
          <Select value={form.department} onValueChange={(v) => setForm({...form, department: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label>Designation</Label><Input value={form.designation} onChange={(e) => setForm({...form, designation: e.target.value})} /></div>
        <div className="space-y-1"><Label>Joining Date</Label><Input type="date" value={form.joiningDate} onChange={(e) => setForm({...form, joiningDate: e.target.value})} /></div>
        <div className="space-y-1"><Label>Salary</Label><Input type="number" value={form.salary} onChange={(e) => setForm({...form, salary: +e.target.value})} /></div>
        <div className="col-span-2 space-y-1"><Label>Password</Label><Input value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Create Employee</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function EditEmployeeDialog({ employee, open, onClose }: { employee: Employee; open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    name: employee.name,
    email: employee.email,
    mobile: employee.mobile,
    department: employee.department,
    designation: employee.designation,
    joiningDate: employee.joiningDate,
    salary: employee.salary,
    password: employee.password,
  });
  function submit() {
    if (!form.name || !form.email) { toast.error("Name and email are required"); return; }
    api.updateEmployee(employee.id, { ...form, status: employee.status });
    toast.success("Employee updated");
    onClose();
  }
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit Employee</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1"><Label>Full Name</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
          <div className="space-y-1"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></div>
          <div className="space-y-1"><Label>Mobile</Label><Input value={form.mobile} onChange={(e) => setForm({...form, mobile: e.target.value})} /></div>
          <div className="space-y-1">
            <Label>Department</Label>
            <Select value={form.department} onValueChange={(v) => setForm({...form, department: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Designation</Label><Input value={form.designation} onChange={(e) => setForm({...form, designation: e.target.value})} /></div>
          <div className="space-y-1"><Label>Joining Date</Label><Input type="date" value={form.joiningDate} onChange={(e) => setForm({...form, joiningDate: e.target.value})} /></div>
          <div className="space-y-1"><Label>Salary</Label><Input type="number" value={form.salary} onChange={(e) => setForm({...form, salary: +e.target.value})} /></div>
          <div className="col-span-2 space-y-1"><Label>Password</Label><Input value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Update Employee</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
