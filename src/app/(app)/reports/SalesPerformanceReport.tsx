import { useState, useEffect } from "react";
import { useAuth } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format, subDays, startOfWeek, startOfMonth } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useDB } from "@/lib/store";
import { Badge } from "@/components/ui/badge";

export function SalesPerformanceReport() {
  const user = useAuth();
  const db = useDB();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("this_month");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [dateFilter, employeeFilter, user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let startDate = "";
      let endDate = format(new Date(), "yyyy-MM-dd");

      const today = new Date();
      if (dateFilter === "today") startDate = format(today, "yyyy-MM-dd");
      else if (dateFilter === "yesterday") startDate = format(subDays(today, 1), "yyyy-MM-dd"), endDate = startDate;
      else if (dateFilter === "this_week") startDate = format(startOfWeek(today), "yyyy-MM-dd");
      else if (dateFilter === "this_month") startDate = format(startOfMonth(today), "yyyy-MM-dd");
      else if (dateFilter === "last_month") {
        const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1);
        startDate = format(d, "yyyy-MM-dd");
        d.setMonth(d.getMonth() + 1); d.setDate(0);
        endDate = format(d, "yyyy-MM-dd");
      }

      const params = new URLSearchParams({
        role: user.role,
        userId: user.employeeId || user.id,
        employeeId: employeeFilter
      });
      if (startDate) {
        params.append("startDate", startDate);
        params.append("endDate", endDate);
      }

      const res = await fetch(`/api/reports/sales-performance?${params.toString()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const json = await res.json();
      if (json.success) setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!data) return null;

  const { employees, summary } = data;

  const TableHeader = ({ title }: { title: string }) => (
    <div className="bg-[#b39ddb] text-center py-2 border border-gray-400 font-bold text-gray-900 tracking-wide uppercase text-sm w-full">
      {title}
    </div>
  );

  const EmployeeHeaders = () => (
    <>
      {employees.map((e: any) => (
        <th 
          key={e.employeeId} 
          onClick={() => setSelectedEmployee(e)}
          className="border border-gray-400 px-3 py-2 text-center text-xs font-bold uppercase min-w-[80px] cursor-pointer hover:bg-muted/50"
        >
          <span className="text-primary hover:underline underline-offset-2">{e.name.split(" ")[0]}</span>
        </th>
      ))}
      <th className="border border-gray-400 px-3 py-2 text-center text-xs font-bold uppercase min-w-[80px]">TOTAL</th>
    </>
  );

  const Row = ({ label, category, field, isTotal = false }: { label: string, category: string, field: string, isTotal?: boolean }) => {
    let rowTotal = 0;
    const cells = employees.map((e: any) => {
      const val = e[category][field] || 0;
      rowTotal += val;
      return <td key={e.employeeId} className={`border border-gray-400 px-3 py-2 text-center text-sm ${isTotal ? 'font-bold' : ''}`}>{val || 0}</td>;
    });
    return (
      <tr className={`${isTotal ? 'bg-gray-100 font-bold' : 'bg-white hover:bg-gray-50'}`}>
        <td className={`border border-gray-400 px-3 py-2 text-xs font-bold whitespace-nowrap uppercase ${isTotal ? '' : 'text-gray-800'}`}>{label}</td>
        {cells}
        <td className="border border-gray-400 px-3 py-2 text-center text-sm font-bold">{rowTotal || 0}</td>
      </tr>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row gap-4 bg-muted/30 p-4 rounded-lg">
        <div className="flex-1 max-w-xs">
          <label className="text-xs font-medium mb-1 block text-muted-foreground">Date Range</label>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {(user?.role === "admin" || user?.role === "hr") && (
          <div className="flex-1 max-w-xs">
            <label className="text-xs font-medium mb-1 block text-muted-foreground">Employee</label>
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger><SelectValue placeholder="All Sales Employees" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sales Employees</SelectItem>
                {employees.map((emp: any) => (
                  <SelectItem key={emp.employeeId} value={emp.employeeId}>{emp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <div className="text-2xl font-bold text-primary">{summary.totalSalesEmployees}</div>
            <div className="text-xs font-medium text-muted-foreground uppercase mt-1">Total Sales Employees</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/10">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <div className="text-2xl font-bold text-blue-600">{summary.totalLeads}</div>
            <div className="text-xs font-medium text-muted-foreground uppercase mt-1">Total Leads</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/10">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <div className="text-2xl font-bold text-emerald-600">{summary.totalPositiveCustomers}</div>
            <div className="text-xs font-medium text-muted-foreground uppercase mt-1">Positive Customers</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 mb-6 items-start">
        {/* LEADS REPORT */}
        <div className="w-full overflow-x-auto shadow-sm border border-gray-400">
          <TableHeader title="LEADS REPORT" />
          <table className="w-full bg-white border-collapse border border-gray-400 min-w-max">
            <thead className="bg-gray-50">
              <tr>
                <th className="border border-gray-400 px-3 py-2 text-center text-xs font-bold uppercase min-w-[150px]">STATUS</th>
                <EmployeeHeaders />
              </tr>
            </thead>
            <tbody>
              <Row label="NEW" category="leads" field="NEW" />
              <Row label="CONTACTED" category="leads" field="CONTACTED" />
              <Row label="FOLLOW UP" category="leads" field="FOLLOW_UP" />
              <Row label="INTERESTED" category="leads" field="INTERESTED" />
              <Row label="POSITIVE" category="leads" field="POSITIVE" />
              <Row label="NOT INTERESTED" category="leads" field="NOT_INTERESTED" />
              <Row label="CONVERTED" category="leads" field="CONVERTED" />
              <Row label="LOST" category="leads" field="LOST" />
              <Row label="TOTAL LEADS" category="leads" field="TOTAL" isTotal />
            </tbody>
          </table>
        </div>
      </div>

      {/* EMPLOYEE DETAILS MODAL */}
      <Dialog open={!!selectedEmployee} onOpenChange={(v) => !v && setSelectedEmployee(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl uppercase tracking-wider">{selectedEmployee?.name} — PERFORMANCE DETAILS</DialogTitle>
            <DialogDescription>
              Employee ID: {selectedEmployee?.employeeId} | Job Role: {selectedEmployee?.jobRole}
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto flex-1 pr-2">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 border rounded bg-muted/20 text-center">
                <div className="text-sm font-semibold text-muted-foreground uppercase">Total Leads</div>
                <div className="text-2xl font-bold">{selectedEmployee?.leads?.TOTAL || 0}</div>
              </div>
              <div className="p-3 border rounded bg-emerald-500/10 text-center">
                <div className="text-sm font-semibold text-emerald-700 uppercase">Positive / Interested</div>
                <div className="text-2xl font-bold text-emerald-700">
                  {(selectedEmployee?.leads?.POSITIVE || 0) + (selectedEmployee?.leads?.INTERESTED || 0)}
                </div>
              </div>
            </div>

            <h3 className="font-semibold text-sm mb-2 uppercase text-muted-foreground">LEADS ASSIGNED</h3>
            <div className="border rounded overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Customer</th>
                    <th className="p-2 text-left">Mobile</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Follow Up</th>
                    <th className="p-2 text-left">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {db.leads?.filter((l: any) => l.employeeId === selectedEmployee?.employeeId).map((lead: any) => (
                    <tr key={lead.id} className="border-t hover:bg-muted/50">
                      <td className="p-2 whitespace-nowrap">{lead.createdAt ? format(new Date(lead.createdAt), "dd MMM, yyyy") : "-"}</td>
                      <td className="p-2 font-medium">{lead.customerName}</td>
                      <td className="p-2">{lead.mobile}</td>
                      <td className="p-2">
                        <Badge variant="outline" className={lead.leadStatus === 'POSITIVE' || lead.leadStatus === 'INTERESTED' ? 'bg-emerald-100 text-emerald-800' : ''}>
                          {lead.leadStatus}
                        </Badge>
                      </td>
                      <td className="p-2">{lead.followUpDate || "-"}</td>
                      <td className="p-2 max-w-[200px] truncate" title={lead.remarks}>{lead.remarks || "-"}</td>
                    </tr>
                  ))}
                  {(!db.leads || db.leads.filter((l: any) => l.employeeId === selectedEmployee?.employeeId).length === 0) && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-muted-foreground">No leads found for this employee.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
