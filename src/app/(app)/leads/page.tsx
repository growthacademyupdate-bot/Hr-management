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
import { Search, Plus, Pencil, Trash2 } from "lucide-react";

export default function LeadsPage() {
  const user = useAuth();
  const db = useDB();
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);

  if (!user || (user.role === "employee" && user.jobRole !== "Sales")) return <div className="p-6">Unauthorized access</div>;

  const leads = db.leads || [];
  
  // Sales sees only their own, Admin sees all
  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.customerName.toLowerCase().includes(search.toLowerCase()) || 
                          l.company?.toLowerCase().includes(search.toLowerCase()) ||
                          l.mobile.includes(search);
    const matchesRole = user.role === "admin" || l.employeeId === (user.employeeId || user.id);
    return matchesSearch && matchesRole;
  });

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

      <Card>
        <CardHeader className="py-4">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, company or mobile..." 
              className="pl-9" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table className="whitespace-nowrap">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Lead Date</TableHead>
                  <TableHead>Client ID</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Client Contact No.</TableHead>
                  <TableHead>Call Outcome</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead>Follow Up</TableHead>
                  <TableHead>Client Follow Up</TableHead>
                  <TableHead>Construction & Interior</TableHead>
                  <TableHead>GMB Profile</TableHead>
                  <TableHead>Logo Work</TableHead>
                  <TableHead>Website Work</TableHead>
                  <TableHead>Documentation</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "N/A"}</TableCell>
                    <TableCell>{lead.id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{lead.customerName}</div>
                      <div className="text-xs text-muted-foreground">{lead.company}</div>
                    </TableCell>
                    <TableCell>
                      <div>{lead.mobile}</div>
                      <div className="text-xs text-muted-foreground">{lead.email}</div>
                    </TableCell>
                    <TableCell>{lead.callOutcome || "-"}</TableCell>
                    <TableCell>{lead.remarks || "-"}</TableCell>
                    <TableCell>{lead.followUpDate || "-"}</TableCell>
                    <TableCell>{lead.clientFollowUp || "-"}</TableCell>
                    <TableCell>{lead.constructionInteriorWork ? "Yes" : "No"}</TableCell>
                    <TableCell>{lead.gmbProfileWork ? "Yes" : "No"}</TableCell>
                    <TableCell>{lead.logoWork ? "Yes" : "No"}</TableCell>
                    <TableCell>{lead.websiteWork ? "Yes" : "No"}</TableCell>
                    <TableCell>{lead.documentationWork ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setEditingLead(lead)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {user.role === "admin" && (
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={async () => {
                          if(confirm("Are you sure?")) {
                            await api.deleteLead(lead.id);
                            toast.success("Lead deleted");
                          }
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLeads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">No leads found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
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
