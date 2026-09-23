"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { useAuth, useDB, api, useGlobalSearch } from "@/lib/store";
import type { Employee } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "../dashboard/page";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/useDataTable";
import { SortableHeader } from "@/components/SortableHeader";
import { DataTablePagination } from "@/components/DataTablePagination";

const DEPARTMENTS = ["Design", "Marketing", "Sales", "HR", "Web", "Finance", "Operations", "Mobile App"];

export default function EmployeesPage() {
  const user = useAuth();
  const db = useDB();
  const globalSearch = useGlobalSearch();
  const [dept, setDept] = useState("all");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const canManage = user?.role === "admin" || user?.role === "hr";

  const baseFilteredEmployees = useMemo(() => {
    return db.employees.filter((e) => {
      if (dept !== "all" && e.department !== dept) return false;
      if (status !== "all" && e.status !== status) return false;
      return true;
    });
  }, [db.employees, dept, status]);

  const {
    search,
    setSearch,
    sortField,
    sortOrder,
    toggleSort,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    paginatedData,
  } = useDataTable({
    data: baseFilteredEmployees,
    searchFields: (e) => [e.name, e.id, e.email, e.department, e.designation, e.mobile, e.status],
    defaultSortField: "name",
    defaultSortOrder: "asc",
  });

  useEffect(() => {
    setSearch(globalSearch);
  }, [globalSearch, setSearch]);

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

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search employees…" 
                className="pl-9" 
                value={search} 
                onChange={(e) => {
                  setSearch(e.target.value);
                  api.setGlobalSearch(e.target.value);
                }} 
              />
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

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader field="name" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>
                    Employee
                  </SortableHeader>
                  <SortableHeader field="department" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>
                    Department
                  </SortableHeader>
                  <SortableHeader field="designation" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>
                    Designation
                  </SortableHeader>
                  <SortableHeader field="mobile" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>
                    Mobile
                  </SortableHeader>
                  <SortableHeader field="joiningDate" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>
                    Joining Date
                  </SortableHeader>
                  <SortableHeader field="status" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>
                    Status
                  </SortableHeader>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((e) => (
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
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={async () => { await api.deleteEmployee(e.id); toast.success("Employee deleted"); }}><Trash2 className="h-4 w-4" /></Button>
                        </>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedData.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No employees match your filters.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <DataTablePagination
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>
      {editingEmp && <EditEmployeeDialog employee={editingEmp} open={editOpen} onClose={() => { setEditOpen(false); setEditingEmp(null); }} />}
    </div>
  );
}

function AddEmployeeDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    customId: "", name: "", email: "", mobile: "", department: "Design", designation: "", joiningDate: new Date().toISOString().slice(0,10), salary: 60000, password: "", avatar: "",
  });
  const [showPw, setShowPw] = useState(false);
  async function submit() {
    if (!form.name || !form.email || !form.mobile || !form.designation || !form.password) { 
      toast.error("Please fill in all required fields (Name, Email, Mobile, Designation, Password)"); 
      return; 
    }
    try {
      const newEmp = await api.addEmployee({ ...form, status: "Active" });
      toast.success(`Employee added! ID: ${newEmp.id}`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add employee.");
    }
  }
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Add New Employee</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        {/* Photo Upload Row */}
        <div className="col-span-2 flex items-center gap-4 py-2 border-b border-muted">
          <Avatar className="h-16 w-16 ring-2 ring-primary/10">
            <AvatarImage src={form.avatar} className="object-cover" />
            <AvatarFallback className="text-xl font-semibold">{form.name?.[0]?.toUpperCase() || "E"}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <Label className="text-sm font-medium">Employee Photo</Label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" asChild>
                <label className="cursor-pointer">
                  Choose Image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          toast.error("Image file size must be less than 2MB");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setForm({ ...form, avatar: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </Button>
              {form.avatar && (
                <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setForm({ ...form, avatar: "" })}>
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-2 space-y-1"><Label>Full Name</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="e.g. John Doe" /></div>
        {/* Employee ID field */}
        <div className="col-span-2 space-y-1">
          <Label className="flex items-center gap-1.5">
            Employee ID
            <span className="text-[11px] text-muted-foreground font-normal">(leave blank to auto-generate)</span>
          </Label>
          <Input
            value={form.customId}
            onChange={(e) => setForm({...form, customId: e.target.value.toUpperCase()})}
            placeholder="e.g. EMP013 — auto-assigned if empty"
            className="font-mono"
            maxLength={20}
          />
        </div>
        <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="employee@example.com" /></div>
        <div className="space-y-1"><Label>Mobile</Label><Input value={form.mobile} onChange={(e) => setForm({...form, mobile: e.target.value})} placeholder="+91 9876543210" /></div>
        <div className="space-y-1">
          <Label>Department</Label>
          <Select value={form.department} onValueChange={(v) => setForm({...form, department: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label>Designation</Label><Input value={form.designation} onChange={(e) => setForm({...form, designation: e.target.value})} placeholder="e.g. Frontend Developer" /></div>
        <div className="space-y-1"><Label>Joining Date</Label><Input type="date" value={form.joiningDate} onChange={(e) => setForm({...form, joiningDate: e.target.value})} /></div>
        <div className="space-y-1"><Label>Salary</Label><Input type="number" value={form.salary} onChange={(e) => setForm({...form, salary: +e.target.value})} /></div>
        <div className="col-span-2 space-y-1">
          <Label>Password</Label>
          <div className="relative">
            <Input type={showPw ? "text" : "password"} value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} placeholder="Enter employee password" />
            <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPw(!showPw)}>
              {showPw ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </div>
        </div>
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
    avatar: employee.avatar || "",
  });
  const [showPw, setShowPw] = useState(false);
  async function submit() {
    if (!form.name || !form.email || !form.mobile || !form.designation || !form.password) { 
      toast.error("Please fill in all required fields (Name, Email, Mobile, Designation, Password)"); 
      return; 
    }
    await api.updateEmployee(employee.id, { ...form, status: employee.status });
    toast.success("Employee updated");
    onClose();
  }
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit Employee</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {/* Photo Upload Row */}
          <div className="col-span-2 flex items-center gap-4 py-2 border-b border-muted">
            <Avatar className="h-16 w-16 ring-2 ring-primary/10">
              <AvatarImage src={form.avatar} className="object-cover" />
              <AvatarFallback className="text-xl font-semibold">{form.name?.[0]?.toUpperCase() || "E"}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Employee Photo</Label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" asChild>
                  <label className="cursor-pointer">
                    Choose Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            toast.error("Image file size must be less than 2MB");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setForm({ ...form, avatar: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </Button>
                {form.avatar && (
                  <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setForm({ ...form, avatar: "" })}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

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
          <div className="col-span-2 space-y-1">
            <Label>Password</Label>
            <div className="relative">
              <Input type={showPw ? "text" : "password"} value={form.password || ""} onChange={(e) => setForm({...form, password: e.target.value})} />
              <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Update Employee</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
