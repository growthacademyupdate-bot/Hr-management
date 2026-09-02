"use client";

import { useState, useMemo } from "react";
import { useAuth, useDB, api, Expense, Role } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useDataTable } from "@/hooks/useDataTable";
import { SortableHeader } from "@/components/SortableHeader";
import { DataTablePagination } from "@/components/DataTablePagination";
import { 
  Receipt, Plus, Search, CheckCircle2, XCircle, Clock, DollarSign, Wallet, FileText, Image as ImageIcon, Check, X, ShieldCheck, Eye, Trash2
} from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["Travel", "Office Supplies", "Client Meeting", "Food & Dining", "Equipment", "Other"] as const;

export default function ExpensesPage() {
  const user = useAuth();
  const db = useDB();

  // Dialog States
  const [openAddModal, setOpenAddModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [openReceiptModal, setOpenReceiptModal] = useState(false);
  const [openReviewModal, setOpenReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewTargetStage, setReviewTargetStage] = useState<"hr" | "admin">("hr");

  // Form State for New Expense Claim
  const [formData, setFormData] = useState({
    title: "",
    category: "Travel" as typeof CATEGORIES[number],
    amount: "",
    expenseDate: new Date().toISOString().slice(0, 10),
    description: "",
    receiptUrl: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters State
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");

  const isAdmin = user?.role === "admin";
  const isHR = user?.role === "hr";
  const isEmployee = user?.role === "employee";
  const currentUserId = user?.employeeId || user?.id;

  // Filtered dataset
  const expensesData = useMemo(() => {
    let list = db.expenses;
    if (isEmployee) {
      list = list.filter((e) => e.employeeId === currentUserId);
    } else if (employeeFilter !== "all") {
      list = list.filter((e) => e.employeeId === employeeFilter);
    }
    if (statusFilter !== "all") {
      list = list.filter((e) => e.status === statusFilter);
    }
    if (categoryFilter !== "all") {
      list = list.filter((e) => e.category === categoryFilter);
    }
    return list.map((exp) => {
      const emp = db.employees.find((e) => e.id === exp.employeeId);
      return {
        ...exp,
        employeeName: emp ? emp.name : exp.employeeId,
        department: emp ? emp.department : "—",
      };
    });
  }, [db.expenses, db.employees, isEmployee, currentUserId, employeeFilter, statusFilter, categoryFilter]);

  // Data Table integration
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
    data: expensesData,
    searchFields: (item) => [item.id, item.title, item.employeeName, item.category, item.description, item.status],
    defaultSortField: "appliedAt",
    defaultSortOrder: "desc",
  });

  // Calculate Metrics
  const metrics = useMemo(() => {
    const relevant = isEmployee ? db.expenses.filter((e) => e.employeeId === currentUserId) : db.expenses;
    const totalClaimed = relevant.reduce((sum, e) => (e.status !== "cancelled" && e.status !== "hr_rejected" && e.status !== "admin_rejected" ? sum + e.amount : sum), 0);
    const pendingAmount = relevant.filter((e) => e.status === "pending" || e.status === "hr_approved").reduce((sum, e) => sum + e.amount, 0);
    const approvedAmount = relevant.filter((e) => e.status === "admin_approved" || (isHR && e.status === "hr_approved")).reduce((sum, e) => sum + e.amount, 0);
    const reimbursedAmount = relevant.filter((e) => e.status === "reimbursed").reduce((sum, e) => sum + e.amount, 0);

    return {
      totalClaimed,
      pendingAmount,
      pendingCount: relevant.filter((e) => e.status === "pending").length,
      approvedAmount,
      reimbursedAmount,
    };
  }, [db.expenses, isEmployee, isHR, currentUserId]);

  if (!user) return null;

  // File Upload Handler (Base64 conversion)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be under 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, receiptUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Expense Form Handler
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.amount || Number(formData.amount) <= 0) {
      toast.error("Please enter a valid title and amount");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.addExpense({
        title: formData.title,
        category: formData.category,
        amount: Number(formData.amount),
        expenseDate: formData.expenseDate,
        description: formData.description,
        receiptUrl: formData.receiptUrl || null,
      });
      toast.success("Expense claim submitted successfully!");
      setOpenAddModal(false);
      setFormData({
        title: "",
        category: "Travel",
        amount: "",
        expenseDate: new Date().toISOString().slice(0, 10),
        description: "",
        receiptUrl: "",
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit expense claim");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Review Dialog Submit
  const handleReviewSubmit = async () => {
    if (!selectedExpense) return;
    if (reviewAction === "reject" && !reviewComment.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setIsSubmitting(true);
    try {
      if (reviewTargetStage === "hr") {
        await api.hrReviewExpense(selectedExpense.id, reviewAction, reviewComment);
        toast.success(`Expense ${reviewAction === "approve" ? "approved" : "rejected"} by HR`);
      } else {
        await api.adminReviewExpense(selectedExpense.id, reviewAction, reviewComment);
        toast.success(`Expense ${reviewAction === "approve" ? "approved" : "rejected"} by Admin`);
      }
      setOpenReviewModal(false);
      setReviewComment("");
    } catch (err: any) {
      toast.error(err.message || "Failed to process review");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mark Reimbursed Handler
  const handleMarkReimbursed = async (expense: Expense) => {
    try {
      await api.markExpenseReimbursed(expense.id);
      toast.success(`Expense ${expense.id} marked as Reimbursed (Paid)!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to mark expense as reimbursed");
    }
  };

  // Cancel Handler
  const handleCancelExpense = async (expenseId: string) => {
    try {
      await api.cancelExpense(expenseId);
      toast.success("Expense claim cancelled");
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel expense claim");
    }
  };

  // Helper for Status Badges
  const renderStatusBadge = (status: Expense["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 font-medium"><Clock className="w-3 h-3 mr-1" /> Pending Review</Badge>;
      case "hr_approved":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 font-medium"><CheckCircle2 className="w-3 h-3 mr-1" /> HR Approved</Badge>;
      case "admin_approved":
        return <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30 font-medium"><ShieldCheck className="w-3 h-3 mr-1" /> Admin Approved</Badge>;
      case "reimbursed":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-medium"><Wallet className="w-3 h-3 mr-1" /> Reimbursed (Paid)</Badge>;
      case "hr_rejected":
        return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 font-medium"><XCircle className="w-3 h-3 mr-1" /> Rejected by HR</Badge>;
      case "admin_rejected":
        return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 font-medium"><XCircle className="w-3 h-3 mr-1" /> Rejected by Admin</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-muted text-muted-foreground font-medium">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          title="Expense & Reimbursement Oversight" 
          description="Manage employee out-of-pocket work expenses, approval flows, and salary payout reimbursements." 
        />
        {isEmployee && (
          <Button onClick={() => setOpenAddModal(true)} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" /> Claim New Expense
          </Button>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Claimed"
          value={`₹${metrics.totalClaimed.toLocaleString()}`}
          icon={Receipt}
          trend={isEmployee ? "Your total requested expense claims" : "Combined employee expense claims"}
          tone="primary"
        />
        <StatCard
          label="Pending Review"
          value={`₹${metrics.pendingAmount.toLocaleString()}`}
          icon={Clock}
          trend={`${metrics.pendingCount} claim(s) awaiting approval`}
          tone="warning"
        />
        <StatCard
          label="Approved (Salary Day Payout)"
          value={`₹${metrics.approvedAmount.toLocaleString()}`}
          icon={ShieldCheck}
          trend="Ready for upcoming payroll calculation"
          tone="info"
        />
        <StatCard
          label="Total Reimbursed"
          value={`₹${metrics.reimbursedAmount.toLocaleString()}`}
          icon={Wallet}
          trend="Successfully paid out to employees"
          tone="success"
        />
      </div>

      {/* Main Table Card */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Expense Records
          </CardTitle>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search expense, employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] text-xs h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="hr_approved">HR Approved</SelectItem>
                <SelectItem value="admin_approved">Admin Approved</SelectItem>
                <SelectItem value="reimbursed">Reimbursed</SelectItem>
                <SelectItem value="hr_rejected">HR Rejected</SelectItem>
                <SelectItem value="admin_rejected">Admin Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px] text-xs h-9">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Employee Filter for HR & Admin */}
            {!isEmployee && (
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="w-[160px] text-xs h-9">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {db.employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="id" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Claim ID</SortableHeader>
                {!isEmployee && (
                  <SortableHeader field="employeeName" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Employee</SortableHeader>
                )}
                <SortableHeader field="title" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Expense Title</SortableHeader>
                <SortableHeader field="category" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Category</SortableHeader>
                <SortableHeader field="expenseDate" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Date</SortableHeader>
                <SortableHeader field="amount" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Amount (₹)</SortableHeader>
                <SortableHeader field="status" currentSortField={sortField} currentSortOrder={sortOrder} onSort={toggleSort}>Status</SortableHeader>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isEmployee ? 7 : 8} className="text-center py-12 text-muted-foreground">
                    <Receipt className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                    No expense claims match the current criteria.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-mono text-xs font-semibold text-primary">{item.id}</TableCell>
                    {!isEmployee && (
                      <TableCell>
                        <div className="font-semibold text-sm">{item.employeeName}</div>
                        <div className="text-[11px] text-muted-foreground">{item.department}</div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="font-medium text-sm">{item.title}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{item.description}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">{item.category}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{new Date(item.expenseDate).toLocaleDateString()}</TableCell>
                    <TableCell className="font-bold text-sm">₹{item.amount.toLocaleString()}</TableCell>
                    <TableCell>{renderStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Receipt / Details */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="View Details & Receipt"
                          onClick={() => {
                            setSelectedExpense(item);
                            setOpenReceiptModal(true);
                          }}
                        >
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </Button>

                        {/* HR Approval Action */}
                        {isHR && item.status === "pending" && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              onClick={() => {
                                setSelectedExpense(item);
                                setReviewAction("approve");
                                setReviewTargetStage("hr");
                                setOpenReviewModal(true);
                              }}
                            >
                              <Check className="h-3 w-3 mr-1" /> Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                              onClick={() => {
                                setSelectedExpense(item);
                                setReviewAction("reject");
                                setReviewTargetStage("hr");
                                setOpenReviewModal(true);
                              }}
                            >
                              <X className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          </div>
                        )}

                        {/* Admin Approval Action */}
                        {isAdmin && (item.status === "pending" || item.status === "hr_approved") && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                              onClick={() => {
                                setSelectedExpense(item);
                                setReviewAction("approve");
                                setReviewTargetStage("admin");
                                setOpenReviewModal(true);
                              }}
                            >
                              <Check className="h-3 w-3 mr-1" /> Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                              onClick={() => {
                                setSelectedExpense(item);
                                setReviewAction("reject");
                                setReviewTargetStage("admin");
                                setOpenReviewModal(true);
                              }}
                            >
                              <X className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          </div>
                        )}

                        {/* Mark as Reimbursed Action (Admin or HR on approved expenses) */}
                        {(isAdmin || isHR) && (item.status === "admin_approved" || item.status === "hr_approved") && (
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleMarkReimbursed(item)}
                          >
                            <Wallet className="h-3 w-3 mr-1" /> Mark Paid
                          </Button>
                        )}

                        {/* Employee Cancel Action */}
                        {isEmployee && item.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-rose-600 hover:bg-rose-50"
                            onClick={() => handleCancelExpense(item.id)}
                          >
                            Cancel
                          </Button>
                        )}

                        {/* Delete Expense (Admin only) */}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                            title="Delete Expense Record"
                            onClick={async () => {
                              if (confirm(`Are you sure you want to delete expense record ${item.id}?`)) {
                                await api.deleteExpense(item.id);
                                toast.success("Expense record deleted");
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
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

      {/* --- MODAL 1: ADD NEW EXPENSE --- */}
      <Dialog open={openAddModal} onOpenChange={setOpenAddModal}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleCreateExpense}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Receipt className="h-5 w-5 text-primary" /> Claim Office Expense
              </DialogTitle>
              <DialogDescription>
                Submit out-of-pocket expenses for official reimbursement (e.g. on salary day).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-semibold">Expense Title / Purpose *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Taxi fare for client meeting, Printer paper"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-semibold">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(val: any) => setFormData({ ...formData, category: val })}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-semibold">Amount (₹) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    step="any"
                    placeholder="e.g. 1500"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseDate" className="text-sm font-semibold">Expense Date *</Label>
                <Input
                  id="expenseDate"
                  type="date"
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold">Description / Notes</Label>
                <Textarea
                  id="description"
                  placeholder="Provide additional details or context for HR and Admin review..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receipt" className="text-sm font-semibold">Attach Receipt (Optional)</Label>
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="cursor-pointer text-xs"
                />
                {formData.receiptUrl && (
                  <div className="mt-2 p-2 border rounded-lg bg-muted/30 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <ImageIcon className="h-4 w-4 text-primary" /> Receipt Attached
                    </span>
                    <button
                      type="button"
                      className="text-xs text-rose-600 hover:underline"
                      onClick={() => setFormData({ ...formData, receiptUrl: "" })}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Claim"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- MODAL 2: RECEIPT & DETAILS VIEW --- */}
      <Dialog open={openReceiptModal} onOpenChange={setOpenReceiptModal}>
        <DialogContent className="sm:max-w-[550px]">
          {selectedExpense && (
            <div>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between text-lg font-bold">
                  <span>Claim {selectedExpense.id} — Details</span>
                  {renderStatusBadge(selectedExpense.status)}
                </DialogTitle>
                <DialogDescription>
                  Submitted on {new Date(selectedExpense.appliedAt).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4 text-sm">
                <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                  <div className="font-semibold text-base">{selectedExpense.title}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Badge variant="secondary">{selectedExpense.category}</Badge>
                    <span>Date: {new Date(selectedExpense.expenseDate).toLocaleDateString()}</span>
                  </div>
                  <div className="text-xl font-bold text-primary mt-2">₹{selectedExpense.amount.toLocaleString()}</div>
                </div>

                {selectedExpense.description && (
                  <div>
                    <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">Description</div>
                    <div className="p-3 rounded-md bg-card border text-sm">{selectedExpense.description}</div>
                  </div>
                )}

                {/* Audit Comments */}
                {selectedExpense.hrReviewComment && (
                  <div className="p-3 rounded-md bg-blue-50/50 border border-blue-100 text-xs">
                    <span className="font-semibold text-blue-900">HR Review Comment: </span>
                    <span className="text-blue-800">{selectedExpense.hrReviewComment}</span>
                  </div>
                )}
                {selectedExpense.adminReviewComment && (
                  <div className="p-3 rounded-md bg-indigo-50/50 border border-indigo-100 text-xs">
                    <span className="font-semibold text-indigo-900">Admin Review Comment: </span>
                    <span className="text-indigo-800">{selectedExpense.adminReviewComment}</span>
                  </div>
                )}

                {/* Receipt Image */}
                <div>
                  <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2">Receipt Attachment</div>
                  {selectedExpense.receiptUrl ? (
                    <div className="border rounded-lg overflow-hidden max-h-[300px] flex justify-center bg-black/5">
                      <img
                        src={selectedExpense.receiptUrl}
                        alt="Receipt"
                        className="object-contain max-h-[300px] w-full"
                      />
                    </div>
                  ) : (
                    <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground text-xs">
                      No receipt image attached to this claim.
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenReceiptModal(false)}>Close</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* --- MODAL 3: HR / ADMIN REVIEW DIALOG --- */}
      <Dialog open={openReviewModal} onOpenChange={setOpenReviewModal}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="capitalize font-bold">
              {reviewTargetStage.toUpperCase()} Review — {reviewAction === "approve" ? "Approve Expense" : "Reject Expense"}
            </DialogTitle>
            <DialogDescription>
              Claim {selectedExpense?.id} (₹{selectedExpense?.amount.toLocaleString()} - {selectedExpense?.title})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Review Notes / Reason {reviewAction === "reject" ? "*" : "(Optional)"}
              </Label>
              <Textarea
                placeholder={reviewAction === "reject" ? "Reason for rejecting this claim..." : "Optional comment..."}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenReviewModal(false)}>Cancel</Button>
            <Button
              variant={reviewAction === "approve" ? "default" : "destructive"}
              disabled={isSubmitting}
              onClick={handleReviewSubmit}
            >
              {isSubmitting ? "Processing..." : reviewAction === "approve" ? "Confirm Approval" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
