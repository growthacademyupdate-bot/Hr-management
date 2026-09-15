"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth, useDB } from "@/lib/store";
import { calculatePayroll, type PayrollInput, type PayrollResult } from "@/lib/payroll";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, WalletCards, Eye, Printer, Download, Search } from "lucide-react";
import { toast } from "sonner";

type Item = { name: string; amount: number };
type Slip = PayrollResult & { id: string; employeeId: string; salaryMonth: number; salaryYear: number; employeeSnapshot: { name: string; id: string; department: string; designation: string; joiningDate: string; email: string; } };
const money = (value: number) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function initialForm(): PayrollInput & { employeeId: string; salaryMonth: number; salaryYear: number } {
  const date = new Date();
  return { employeeId: "", salaryMonth: date.getMonth() + 1, salaryYear: date.getFullYear(), annualCTC: 0, basicSalary: 0, hra: 0, hraMode: "amount", conveyance: 0, medicalAllowance: 0, specialAllowance: 0, earnings: [], deductions: [], pfEnabled: false, pfEmployeePercentage: 12, pfEmployerPercentage: 12, pfWageCeiling: 0, esiEnabled: false, esiEmployeePercentage: 0.75, esiEmployerPercentage: 3.25, professionalTaxEnabled: true, professionalTax: 200, tdsEnabled: false, monthlyTds: 0, workingDays: 30, paidDays: 30, lwpDays: 0 };
}

function automaticBasicSalary(annualCTC: number) {
  return Math.round((Number(annualCTC || 0) / 12 * 0.5 + Number.EPSILON) * 100) / 100;
}

export default function SalarySlipsPage() {
  const user = useAuth();
  const db = useDB();
  const canManage = user?.role === "admin" || user?.role === "hr";
  const [form, setForm] = useState(initialForm);
  const [slips, setSlips] = useState<Slip[]>([]);
  const [selected, setSelected] = useState<Slip | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const preview = useMemo(() => { try { return calculatePayroll({ ...form, basicSalary: automaticBasicSalary(form.annualCTC) }); } catch { return null; } }, [form]);
  const headers = useMemo(() => ({ "Content-Type": "application/json", "x-user-id": user?.employeeId || user?.id || "", "x-user-role": user?.role || "employee" }), [user]);

  async function loadSlips() {
    if (!user) return;
    const response = await fetch("/api/salary-slips", { headers });
    const data = await response.json();
    if (response.ok) setSlips(data.data || []); else toast.error(data.error || "Could not load salary slips");
  }

  async function downloadSlip(id: string) {
    const response = await fetch(`/api/salary-slips/${id}/pdf`, { headers });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      toast.error(data.error || "Could not download salary slip");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `SalarySlip_${id}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function deleteSlip(id: string) {
    if (!canManage || !window.confirm("Delete this salary slip? This cannot be undone.")) return;
    const response = await fetch(`/api/salary-slips/${id}`, { method: "DELETE", headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) toast.error(data.error || "Could not delete salary slip");
    else { toast.success("Salary slip deleted"); setSelected((current) => current?.id === id ? null : current); await loadSlips(); }
  }
  useEffect(() => { loadSlips(); }, [user, headers]);
  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function addItem(key: "earnings" | "deductions") { update(key, [...(form[key] || []), { name: key === "earnings" ? "Other Earnings" : "Other Deduction", amount: 0 }]); }
  function updateItem(key: "earnings" | "deductions", index: number, patch: Partial<Item>) { update(key, (form[key] || []).map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)); }

  async function generate() {
    if (!form.employeeId || !form.annualCTC) { toast.error("Select an employee and enter annual CTC"); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/salary-slips", { method: "POST", headers, body: JSON.stringify({ ...form, basicSalary: automaticBasicSalary(form.annualCTC) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not generate salary slip");
      toast.success("Salary slip generated successfully");
      setSelected(data.data); await loadSlips();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not generate salary slip"); }
    finally { setLoading(false); }
  }

  if (!user) return null;
  const employee = db.employees.find((item) => item.id === form.employeeId);
  const setNumber = (key: keyof typeof form, value: string) => update(key, Math.max(0, Number(value) || 0) as never);
  const visibleSlips = slips.filter((slip) => {
    const matchesSearch = !search || `${slip.employeeSnapshot?.name || ""} ${slip.employeeId}`.toLowerCase().includes(search.toLowerCase());
    const matchesMonth = !filterMonth || String(slip.salaryMonth) === filterMonth;
    const matchesYear = !filterYear || String(slip.salaryYear) === filterYear;
    const matchesDepartment = !filterDepartment || slip.employeeSnapshot?.department === filterDepartment;
    return matchesSearch && matchesMonth && matchesYear && matchesDepartment;
  });

  return <div className="space-y-6">
    <PageHeader title={canManage ? "Salary Slips" : "My Salary Slips"} description={canManage ? "Generate, review and manage monthly payroll snapshots." : "Your historical salary slips and net pay."} />
    <div className="flex items-center gap-3">
      <Label htmlFor="salary-department-filter" className="text-sm text-muted-foreground">Department</Label>
      <Select value={filterDepartment} onValueChange={(value) => setFilterDepartment(value === "all" ? "" : value)}>
        <SelectTrigger id="salary-department-filter" className="w-56"><SelectValue placeholder="All departments" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All departments</SelectItem>
          {Array.from(new Set(db.employees.map((employee) => employee.department).filter(Boolean))).sort().map((department) => <SelectItem key={department} value={department}>{department}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    {canManage && <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)]">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-primary" /> Generate salary slip</CardTitle></CardHeader><CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3"><div className="space-y-2 sm:col-span-2"><Label>Employee</Label><Select value={form.employeeId} onValueChange={(value) => update("employeeId", value)}><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger><SelectContent>{db.employees.filter((item) => item.status !== "Inactive").map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {item.id}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Payroll month</Label><Input type="month" value={`${form.salaryYear}-${String(form.salaryMonth).padStart(2, "0")}`} onChange={(event) => { const [year, month] = event.target.value.split("-").map(Number); setForm((current) => ({ ...current, salaryYear: year, salaryMonth: month })); }} /></div></div>
        {employee && <div className="grid gap-3 rounded-lg bg-muted/40 p-3 text-sm sm:grid-cols-4"><div><span className="text-muted-foreground">Department</span><div className="font-medium">{employee.department}</div></div><div><span className="text-muted-foreground">Designation</span><div className="font-medium">{employee.designation}</div></div><div><span className="text-muted-foreground">Joining date</span><div className="font-medium">{employee.joiningDate}</div></div><div><span className="text-muted-foreground">Email</span><div className="font-medium truncate">{employee.email}</div></div></div>}
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Annual CTC" value={form.annualCTC || ""} onChange={(value) => setNumber("annualCTC", value)} /><Field label="Monthly CTC" value={form.annualCTC ? (Number(form.annualCTC) / 12).toFixed(2) : ""} onChange={() => undefined} disabled /></div>
        <div className="grid gap-3 sm:grid-cols-4"><Field label="HRA" value={form.hra || 0} onChange={(value) => setNumber("hra", value)} /><Field label="Conveyance" value={form.conveyance || 0} onChange={(value) => setNumber("conveyance", value)} /><Field label="Medical" value={form.medicalAllowance || 0} onChange={(value) => setNumber("medicalAllowance", value)} /><Field label="Special allowance" value={form.specialAllowance || preview?.specialAllowance || 0} onChange={(value) => setNumber("specialAllowance", value)} /></div>
        <div className="grid gap-3 sm:grid-cols-4"><Field label="Working days" value={form.workingDays || 30} onChange={(value) => setNumber("workingDays", value)} /><Field label="LWP days" value={form.lwpDays || 0} onChange={(value) => setNumber("lwpDays", value)} /><Toggle label="PF enabled" checked={Boolean(form.pfEnabled)} onCheckedChange={(value) => update("pfEnabled", value)} /><Toggle label="ESI enabled" checked={Boolean(form.esiEnabled)} onCheckedChange={(value) => update("esiEnabled", value)} /></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="PF employee %" value={form.pfEmployeePercentage || 0} onChange={(value) => setNumber("pfEmployeePercentage", value)} /><Field label="PF wage ceiling" value={form.pfWageCeiling || 0} onChange={(value) => setNumber("pfWageCeiling", value)} /><Field label="Professional tax" value={form.professionalTax || 0} onChange={(value) => setNumber("professionalTax", value)} /><Field label="Monthly TDS" value={form.monthlyTds || 0} onChange={(value) => setNumber("monthlyTds", value)} /></div>
        <div className="grid gap-4 sm:grid-cols-2"><Toggle label="Professional tax enabled" checked={Boolean(form.professionalTaxEnabled)} onCheckedChange={(value) => update("professionalTaxEnabled", value)} /><Toggle label="Income tax / TDS enabled" checked={Boolean(form.tdsEnabled)} onCheckedChange={(value) => update("tdsEnabled", value)} /></div>
        <ItemEditor title="Custom earnings" items={form.earnings || []} onAdd={() => addItem("earnings")} onChange={(index, patch) => updateItem("earnings", index, patch)} onRemove={(index) => update("earnings", (form.earnings || []).filter((_, itemIndex) => itemIndex !== index))} />
        <ItemEditor title="Custom deductions" items={form.deductions || []} onAdd={() => addItem("deductions")} onChange={(index, patch) => updateItem("deductions", index, patch)} onRemove={(index) => update("deductions", (form.deductions || []).filter((_, itemIndex) => itemIndex !== index))} />
        <Button className="w-full" onClick={generate} disabled={loading}>{loading ? "Generating..." : "Generate salary slip"}</Button>
      </CardContent></Card>
      <Preview result={preview} employee={employee} month={form.salaryMonth} year={form.salaryYear} onPrint={() => window.print()} />
    </div>}
    {selected && <Preview result={selected} employee={db.employees.find((item) => item.id === selected.employeeId)} month={selected.salaryMonth} year={selected.salaryYear} onPrint={() => downloadSlip(selected.id)} />}
    <Card><CardHeader><CardTitle>Salary slip history</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_140px]"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search employee or ID" value={search} onChange={(event) => setSearch(event.target.value)} /></div><Input type="number" min="2000" placeholder="Year" value={filterYear} onChange={(event) => setFilterYear(event.target.value)} /><Select value={filterMonth} onValueChange={(value) => setFilterMonth(value === "all" ? "" : value)}><SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger><SelectContent><SelectItem value="all">All months</SelectItem>{Array.from({ length: 12 }, (_, index) => <SelectItem key={index + 1} value={String(index + 1)}>{new Date(2000, index).toLocaleString("en-IN", { month: "long" })}</SelectItem>)}</SelectContent></Select></div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Period</TableHead><TableHead>Gross</TableHead><TableHead>Deductions</TableHead><TableHead>Net salary</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{visibleSlips.map((slip) => <TableRow key={slip.id}><TableCell><div className="font-medium">{slip.employeeSnapshot?.name || slip.employeeId}</div><div className="text-xs text-muted-foreground">{slip.employeeId}</div></TableCell><TableCell>{new Date(slip.salaryYear, slip.salaryMonth - 1).toLocaleString("en-IN", { month: "long", year: "numeric" })}</TableCell><TableCell>{money(slip.grossSalary)}</TableCell><TableCell>{money(slip.totalDeductions)}</TableCell><TableCell className="font-semibold">{money(slip.netSalary)}</TableCell><TableCell><Badge variant="secondary">Generated</Badge></TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" title="View slip" onClick={() => setSelected(slip)}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon" title="Download PDF" onClick={() => downloadSlip(slip.id)}><Download className="h-4 w-4" /></Button>{canManage && <Button variant="ghost" size="icon" title="Delete slip" className="text-destructive" onClick={() => deleteSlip(slip.id)}><Trash2 className="h-4 w-4" /></Button>}</TableCell></TableRow>)}{visibleSlips.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No salary slips match these filters.</TableCell></TableRow>}</TableBody></Table></div></CardContent></Card>
  </div>;
}

function Field({ label, value, onChange, disabled }: { label: string; value: number | string; onChange: (value: string) => void; disabled?: boolean }) { return <div className="space-y-2"><Label>{label}</Label><Input type="number" min="0" step="0.01" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} /></div>; }
function Toggle({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (value: boolean) => void }) { return <label className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"><span>{label}</span><Switch checked={checked} onCheckedChange={onCheckedChange} /></label>; }
function ItemEditor({ title, items, onAdd, onChange, onRemove }: { title: string; items: Item[]; onAdd: () => void; onChange: (index: number, patch: Partial<Item>) => void; onRemove: (index: number) => void }) { return <div className="space-y-2"><div className="flex items-center justify-between"><Label>{title}</Label><Button type="button" variant="outline" size="sm" onClick={onAdd}><Plus className="mr-1 h-4 w-4" />Add</Button></div>{items.map((item, index) => <div key={`${title}-${index}`} className="flex gap-2"><Input value={item.name} onChange={(event) => onChange(index, { name: event.target.value })} /><Input type="number" min="0" step="0.01" value={item.amount} onChange={(event) => onChange(index, { amount: Math.max(0, Number(event.target.value) || 0) })} /><Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => onRemove(index)}><Trash2 className="h-4 w-4" /></Button></div>)}</div>; }
function Preview({ result, employee, month, year, onPrint }: { result: PayrollResult | null; employee?: { name: string; id: string; department: string; designation: string; joiningDate: string; email: string } | null; month: number; year: number; onPrint: () => void }) { return <Card className="border-primary/20"><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Salary slip preview</CardTitle><Button variant="outline" size="sm" onClick={onPrint}><Printer className="mr-2 h-4 w-4" />Print / PDF</Button></CardHeader><CardContent>{!result ? <div className="py-16 text-center text-muted-foreground">Enter salary details to preview the slip.</div> : <div className="space-y-4 text-sm"><div className="border-b pb-4"><div className="text-lg font-bold">WORKMONITOR</div><div className="text-muted-foreground">Salary Slip · {new Date(year, month - 1).toLocaleString("en-IN", { month: "long", year: "numeric" })}</div></div><div className="grid grid-cols-2 gap-2"><div><span className="text-muted-foreground">Employee</span><div className="font-medium">{employee?.name || "-"}</div></div><div><span className="text-muted-foreground">Employee ID</span><div className="font-medium">{employee?.id || "-"}</div></div><div><span className="text-muted-foreground">Department</span><div>{employee?.department || "-"}</div></div><div><span className="text-muted-foreground">Designation</span><div>{employee?.designation || "-"}</div></div></div><div className="grid grid-cols-2 gap-2 border-y py-3"><Line label="Monthly CTC" value={money(result.monthlyCTC)} /><Line label="Gross earnings" value={money(result.grossSalary)} /><Line label="Total deductions" value={money(result.totalDeductions)} /><Line label="Net salary" value={money(result.netSalary)} strong /></div><div className="rounded-lg bg-primary/5 p-4"><div className="text-xs uppercase tracking-wide text-muted-foreground">Net salary</div><div className="text-2xl font-bold text-primary">{money(result.netSalary)}</div><div className="mt-1 text-xs text-muted-foreground">{result.amountInWords}</div></div></div>}</CardContent></Card>; }
function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) { return <div><div className="text-muted-foreground">{label}</div><div className={strong ? "font-bold text-primary" : "font-medium"}>{value}</div></div>; }