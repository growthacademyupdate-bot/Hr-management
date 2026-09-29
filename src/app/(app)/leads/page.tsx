"use client";

import { useState } from "react";
import { useAuth, useDB, api } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Plus, Pencil, Trash2, CalendarIcon, UserIcon } from "lucide-react";
import { useDataTable } from "@/hooks/useDataTable";
import { DataTablePagination } from "@/components/DataTablePagination";
import { Badge } from "@/components/ui/badge";

export default function LeadsPage() {
  const user = useAuth();
  const db = useDB();
  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);

  const leads = db.leads || [];
  
  const salesEmployees = db.employees?.filter((e: any) => e.jobRole === "Sales" && e.status === "Active") || [];

  const filteredLeads = leads.filter(l => {
    if (!user) return false;
    const matchesSearch = l.customerName.toLowerCase().includes(search.toLowerCase()) || 
                          l.company?.toLowerCase().includes(search.toLowerCase()) ||
                          l.mobile.includes(search);
    const matchesRole = user.role === "admin" || l.employeeId === (user.employeeId || user.id);
    const matchesEmployeeFilter = employeeFilter === "all" || l.employeeId === employeeFilter;
    
    return matchesSearch && matchesRole && matchesEmployeeFilter;
  });

  const { 
    paginatedData, 
    page, 
    setPage, 
    pageSize, 
    setPageSize, 
    totalPages, 
    totalItems, 
    startIndex, 
    endIndex 
  } = useDataTable({ 
    data: filteredLeads, 
    defaultPageSize: 15 
  });

  if (!user || (user.role === "employee" && user.jobRole !== "Sales")) return <div className="p-6">Unauthorized access</div>;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW": return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">NEW</Badge>;
      case "CONTACTED": return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">CONTACTED</Badge>;
      case "FOLLOW_UP": return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">FOLLOW UP</Badge>;
      case "INTERESTED": return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">INTERESTED</Badge>;
      case "POSITIVE": return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">POSITIVE</Badge>;
      case "NOT_INTERESTED": return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">NOT INTERESTED</Badge>;
      case "CONVERTED": return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 font-bold">CONVERTED</Badge>;
      case "LOST": return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">LOST</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads Management</h1>
          <p className="text-muted-foreground">Manage your sales leads</p>
        </div>
        {(user.role === "admin" || user.jobRole === "Sales") && (
          <Button onClick={() => setIsAddOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Lead</Button>
        )}
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="py-4 bg-muted/20 border-b border-border">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, company or mobile..." 
                className="pl-9 bg-white" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {user.role === "admin" && (
              <div className="w-full sm:w-64">
                <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="All Sales Employees" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {salesEmployees.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="whitespace-nowrap w-full">
              <TableHeader className="bg-muted/50 text-xs uppercase tracking-wider">
                <TableRow>
                  <TableHead className="font-semibold text-muted-foreground">Date</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Employee</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Client Name</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Contact</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Status & Outcome</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Remarks</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Follow Up</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Client Follow Up</TableHead>
                  <TableHead className="font-semibold text-muted-foreground text-center">Construction</TableHead>
                  <TableHead className="font-semibold text-muted-foreground text-center">GMB</TableHead>
                  <TableHead className="font-semibold text-muted-foreground text-center">Logo</TableHead>
                  <TableHead className="font-semibold text-muted-foreground text-center">Website</TableHead>
                  <TableHead className="font-semibold text-muted-foreground text-center">Documentation</TableHead>
                  <TableHead className="text-right font-semibold text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((lead) => {
                  const employeeName = db.employees?.find((e: any) => e.id === lead.employeeId)?.name || lead.employeeId || "-";
                  return (
                    <TableRow key={lead.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <CalendarIcon className="mr-1 h-3 w-3" />
                          {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "N/A"}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase">{lead.id}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center font-medium text-sm">
                          <UserIcon className="mr-1 h-3 w-3 text-muted-foreground" />
                          {employeeName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-sm">{lead.customerName}</div>
                        <div className="text-xs text-muted-foreground">{lead.company || "-"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{lead.mobile}</div>
                        <div className="text-xs text-muted-foreground">{lead.email || "-"}</div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(lead.leadStatus)}
                        {lead.callOutcome && <div className="text-xs mt-1 text-muted-foreground max-w-[120px] truncate" title={lead.callOutcome}>{lead.callOutcome}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm max-w-[150px] truncate" title={lead.remarks}>{lead.remarks || "-"}</div>
                      </TableCell>
                      <TableCell>
                        {lead.followUpDate && (
                          <div className="text-sm px-2 py-1 bg-amber-50 text-amber-700 rounded border border-amber-100 inline-block">
                            {lead.followUpDate}
                          </div>
                        )}
                        {!lead.followUpDate && "-"}
                      </TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate" title={lead.clientFollowUp}>{lead.clientFollowUp || "-"}</TableCell>
                      <TableCell className="text-center">{lead.constructionInteriorWork ? <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Yes</Badge> : <span className="text-muted-foreground/30">-</span>}</TableCell>
                      <TableCell className="text-center">{lead.gmbProfileWork ? <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Yes</Badge> : <span className="text-muted-foreground/30">-</span>}</TableCell>
                      <TableCell className="text-center">{lead.logoWork ? <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Yes</Badge> : <span className="text-muted-foreground/30">-</span>}</TableCell>
                      <TableCell className="text-center">{lead.websiteWork ? <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Yes</Badge> : <span className="text-muted-foreground/30">-</span>}</TableCell>
                      <TableCell className="text-center">{lead.documentationWork ? <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Yes</Badge> : <span className="text-muted-foreground/30">-</span>}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" className="h-8 border-primary/20 text-primary hover:bg-primary/10" onClick={() => setEditingLead(lead)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          {(user.role === "admin" || user.jobRole === "Sales") && (
                            <Button variant="outline" size="sm" className="h-8 border-destructive/20 text-destructive hover:bg-destructive/10" onClick={async () => {
                              if(confirm("Are you sure you want to delete this lead?")) {
                                await api.deleteLead(lead.id);
                                toast.success("Lead deleted successfully");
                              }
                            }}>
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {paginatedData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={15} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Search className="h-8 w-8 mb-2 opacity-20" />
                        <p>No leads found matching your criteria.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="p-4 border-t border-border bg-muted/10">
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
            </div>
          )}
        </CardContent>
      </Card>

      <LeadFormDialog open={isAddOpen} onClose={() => setIsAddOpen(false)} />
      {editingLead && (
        <LeadFormDialog open={!!editingLead} lead={editingLead} onClose={() => setEditingLead(null)} />
      )}
    </div>
  );
}

function LeadFormDialog({ open, onClose, lead }: { open: boolean; onClose: () => void; lead?: any }) {
  const [form, setForm] = useState(lead || {
    customerName: "", company: "", mobile: "", email: "", leadStatus: "NEW", remarks: "",
    callOutcome: "", followUpDate: "", clientFollowUp: "",
    constructionInteriorWork: false, gmbProfileWork: false, logoWork: false, websiteWork: false, documentationWork: false
  });

  const user = useAuth();
  const db = useDB();
  const isEditing = !!lead;
  
  // Fetch sales employees for assignment if admin
  const salesEmployees = db.employees?.filter((e: any) => e.jobRole === "Sales" && e.status === "Active") || [];

  async function submit() {
    if (!form.customerName || !form.mobile) {
      toast.error("Customer name and mobile are required");
      return;
    }
    try {
      if (isEditing) {
        await api.updateLead(lead.id, form);
        toast.success("Lead updated");
      } else {
        await api.addLead(form);
        toast.success("Lead created");
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save lead");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Lead" : "Add New Lead"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4 max-h-[65vh] overflow-y-auto px-1">
          <div className="col-span-2 space-y-2">
            <Label>Customer Name *</Label>
            <Input value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} placeholder="Full name" />
          </div>
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input value={form.company} onChange={e => setForm({...form, company: e.target.value})} placeholder="Company" />
          </div>
          <div className="space-y-2">
            <Label>Mobile Number *</Label>
            <Input value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} placeholder="10-digit number" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Email address" />
          </div>
          <div className="space-y-2">
            <Label>Lead Status</Label>
            <Select value={form.leadStatus} onValueChange={v => setForm({...form, leadStatus: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["NEW", "CONTACTED", "FOLLOW_UP", "INTERESTED", "POSITIVE", "NOT_INTERESTED", "CONVERTED", "LOST"].map(s => (
                  <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Call Outcome</Label>
            <Input value={form.callOutcome} onChange={e => setForm({...form, callOutcome: e.target.value})} placeholder="Outcome" />
          </div>
          <div className="space-y-2">
            <Label>Follow Up Date</Label>
            <Input type="date" value={form.followUpDate} onChange={e => setForm({...form, followUpDate: e.target.value})} />
          </div>
          {user?.role === "admin" && (
            <div className="space-y-2">
              <Label>Assign to Sales Employee</Label>
              <Select value={form.employeeId || ""} onValueChange={v => setForm({...form, employeeId: v})}>
                <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
                <SelectContent>
                  {salesEmployees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="col-span-2 space-y-2">
            <Label>Client Follow Up</Label>
            <Input value={form.clientFollowUp} onChange={e => setForm({...form, clientFollowUp: e.target.value})} placeholder="Client follow up notes..." />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Remarks</Label>
            <Input value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} placeholder="Notes..." />
          </div>
          <div className="col-span-2">
            <Label className="mb-2 block">Work Requirements</Label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="w-4 h-4" checked={form.constructionInteriorWork} onChange={e => setForm({...form, constructionInteriorWork: e.target.checked})} />
                <span>Construction & Interior Work</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="w-4 h-4" checked={form.gmbProfileWork} onChange={e => setForm({...form, gmbProfileWork: e.target.checked})} />
                <span>GMB Profile Work</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="w-4 h-4" checked={form.logoWork} onChange={e => setForm({...form, logoWork: e.target.checked})} />
                <span>Logo Work</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="w-4 h-4" checked={form.websiteWork} onChange={e => setForm({...form, websiteWork: e.target.checked})} />
                <span>Website Work</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="w-4 h-4" checked={form.documentationWork} onChange={e => setForm({...form, documentationWork: e.target.checked})} />
                <span>Documentation Work</span>
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>{isEditing ? "Save Changes" : "Create Lead"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
