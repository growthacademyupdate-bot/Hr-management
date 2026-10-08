"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth, useDB, api, Expense, Role, useGlobalSearch } from "@/lib/store";
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
  Receipt, Plus, Search, CheckCircle2, XCircle, Clock, DollarSign, Wallet, FileText, Image as ImageIcon, Check, X, ShieldCheck, Eye, Trash2, Printer
} from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";

const CATEGORIES = ["Travel", "Office Supplies", "Client Meeting", "Food & Dining", "Equipment", "Other"] as const;

export default function ExpensesPage() {
  const user = useAuth();
  const db = useDB();
  const globalSearch = useGlobalSearch();

  // Dialog States
  const [openAddModal, setOpenAddModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [openReceiptModal, setOpenReceiptModal] = useState(false);
  const [openReviewModal, setOpenReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewTargetStage, setReviewTargetStage] = useState<"hr" | "admin">("hr");
  const [printExpense, setPrintExpense] = useState<Expense | null>(null);

  // Form State for New Expense Claim
  const [formData, setFormData] = useState({
    title: "",
    category: "Travel" as typeof CATEGORIES[number],
    amount: "",
    expenseDate: new Date().toISOString().slice(0, 10),
    description: "",
    receiptUrl: "",
    gstPercent: "0",
    bankHolderName: "",
    bankName: "",
    branch: "",
    accountNo: "",
    ifscCode: "",
    upiId: "",
    customCategory: "",
    vehicleType: "",
    vehicleNumber: "",
    targetEmployeeId: "",
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

  useEffect(() => {
    setSearch(globalSearch);
  }, [globalSearch, setSearch]);

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
        category: formData.category === "Other" && formData.customCategory.trim() ? formData.customCategory : formData.category,
        amount: Number(formData.amount),
        expenseDate: formData.expenseDate,
        description: formData.description,
        receiptUrl: formData.receiptUrl || null,
        gstPercent: Number(formData.gstPercent) || 0,
        bankHolderName: formData.bankHolderName || null,
        bankName: formData.bankName || null,
        branch: formData.branch || null,
        accountNo: formData.accountNo || null,
        ifscCode: formData.ifscCode || null,
        upiId: formData.upiId || null,
        vehicleType: formData.vehicleType || null,
        vehicleNumber: formData.vehicleNumber || null,
        targetEmployeeId: (!isEmployee && formData.targetEmployeeId) ? formData.targetEmployeeId : currentUserId,
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
        gstPercent: "0",
        bankHolderName: "",
        bankName: "",
        branch: "",
        accountNo: "",
        ifscCode: "",
        upiId: "",
        customCategory: "",
        vehicleType: "",
        vehicleNumber: "",
        targetEmployeeId: "",
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

  const numberToWords = (num: number): string => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const numStr = num.toString();
    if (numStr.length > 9) return 'overflow';
    const n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
    str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
    str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
    str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
    str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
    return str.trim() + ' Rupees Only';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          title="Expense & Reimbursement Oversight" 
          description="Manage employee out-of-pocket work expenses, approval flows, and salary payout reimbursements." 
        />
        <Button onClick={() => setOpenAddModal(true)} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> Claim New Expense
        </Button>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-indigo-600 hover:bg-indigo-50"
                          title="Print Expense Bill"
                          onClick={() => setPrintExpense(item)}
                        >
                          <FileText className="h-4 w-4" />
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
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
              {!isEmployee && (
                <div className="space-y-2">
                  <Label htmlFor="targetEmployee" className="text-sm font-semibold">Employee *</Label>
                  <Select
                    value={formData.targetEmployeeId}
                    onValueChange={(val: string) => setFormData({ ...formData, targetEmployeeId: val })}
                    required
                  >
                    <SelectTrigger id="targetEmployee">
                      <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {db.employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
                  {formData.category === "Other" && (
                    <Input 
                      placeholder="Please specify category" 
                      value={formData.customCategory}
                      onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                      required
                      className="mt-2"
                    />
                  )}
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

              <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="gstPercent" className="text-sm font-semibold">GST %</Label>
                  <Input
                    id="gstPercent"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 18"
                    value={formData.gstPercent}
                    onChange={(e) => setFormData({ ...formData, gstPercent: e.target.value })}
                  />
                </div>
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

              {(formData.category === "Travel" || /bike|car|scooter|vehicle|fuel|petrol/i.test(formData.category === "Other" ? formData.customCategory : formData.category)) && (
                <div className="space-y-3 p-4 border rounded-lg bg-orange-50/50 border-orange-100">
                  <div className="font-semibold text-sm text-orange-900">Vehicle Details</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Vehicle Type</Label>
                      <Input className="h-8 text-xs" placeholder="e.g. Bike, Car" value={formData.vehicleType} onChange={e => setFormData({...formData, vehicleType: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Vehicle Number</Label>
                      <Input className="h-8 text-xs" placeholder="e.g. MH 12 AB 1234" value={formData.vehicleNumber} onChange={e => setFormData({...formData, vehicleNumber: e.target.value})} />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 p-4 border rounded-lg bg-slate-50/50">
                <div className="font-semibold text-sm text-slate-800">Bank Details (Optional)</div>
                <div className="text-xs text-muted-foreground mb-2">If filled, these will appear on your generated Expense Bill.</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Account Holder Name</Label>
                    <Input className="h-8 text-xs" placeholder="e.g. John Doe" value={formData.bankHolderName} onChange={e => setFormData({...formData, bankHolderName: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Bank Name</Label>
                    <Input className="h-8 text-xs" placeholder="e.g. HDFC Bank" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Branch</Label>
                    <Input className="h-8 text-xs" placeholder="e.g. Connaught Place" value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Account No</Label>
                    <Input className="h-8 text-xs" placeholder="e.g. 1234567890" value={formData.accountNo} onChange={e => setFormData({...formData, accountNo: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">IFSC Code</Label>
                    <Input className="h-8 text-xs" placeholder="e.g. HDFC0001234" value={formData.ifscCode} onChange={e => setFormData({...formData, ifscCode: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">UPI ID</Label>
                    <Input className="h-8 text-xs" placeholder="e.g. yourname@upi" value={formData.upiId} onChange={e => setFormData({...formData, upiId: e.target.value})} />
                  </div>
                </div>
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
                      <Image
                        src={selectedExpense.receiptUrl}
                        alt="Receipt"
                        width={400}
                        height={300}
                        className="object-contain max-h-[300px] w-full"
                        unoptimized
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

      {/* --- MODAL 4: PRINT BILL MODAL --- */}
      {printExpense && (
        <PrintExpenseBillModal 
          expense={printExpense} 
          employee={db.employees.find(e => e.id === printExpense.employeeId)}
          onClose={() => setPrintExpense(null)} 
          numberToWords={numberToWords}
        />
      )}
    </div>
  );
}

function PrintExpenseBillModal({ expense, employee, onClose, numberToWords }: { expense: Expense, employee: any, onClose: () => void, numberToWords: (n: number) => string }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    // @ts-ignore
    content: () => contentRef.current,
    documentTitle: `Expense_Bill_${expense.id}`,
  });

  const gstPercent = expense.gstPercent || 0;
  const taxableAmount = expense.amount;
  const gstAmount = taxableAmount * (gstPercent / 100);
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  const totalAmount = taxableAmount + gstAmount;

  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto bg-gray-50 p-6">
        <DialogHeader className="flex flex-row justify-between items-center print:hidden mb-4">
          <DialogTitle>Print Expense Bill</DialogTitle>
          <Button onClick={handlePrint} className="mr-6"><Printer className="h-4 w-4 mr-2" /> Print Bill</Button>
        </DialogHeader>

        {/* Printable Area */}
        <div ref={contentRef} className="p-8 bg-white text-black min-h-[1056px] w-full font-sans text-[13px] border relative">
          
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="AL-MAWA Logo" className="max-h-16 max-w-[120px] object-contain" />
              <div>
                <div className="text-xs font-semibold text-gray-500">GSTIN : 27ABDCA0474D1Z1</div>
                <h1 className="text-2xl font-bold uppercase tracking-tight text-blue-900 mt-1">AL-MAWA INTERNATIONAL</h1>
                <div className="text-xs text-gray-600 mt-1">
                  Office No. 102-103 (Nexus Work Spaces), 1st Floor, Pride Icon Building, above Athithi Restaurant<br/>
                  Kharadi-Mundhwa Road, Kharadi, Pune, Maharashtra, PIN Code 411014<br/>
                  Contact No. : 📞 +91 95611 79693 | 📞 +91 95611 06693 | 📞 +91 90283 22363
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-400 uppercase tracking-widest">Tax Invoice</div>
              <div className="text-xs text-gray-500 mt-1">Original / Duplicate Bill</div>
            </div>
          </div>

          <div className="grid grid-cols-3 border border-black mb-4">
            <div className="col-span-1 border-r border-black p-2 space-y-1">
              <div className="font-bold text-xs bg-gray-100 -m-2 mb-2 p-1 border-b border-black">Bill To</div>
              <div className="font-bold">{employee?.name}</div>
              <div className="w-48 break-words text-xs">{employee?.address || "Address not provided"}</div>
              <div className="text-xs">State: {employee?.state || "N/A"}</div>
              <div className="text-xs">GSTIN: {employee?.gstin || "URD"}</div>
            </div>
            <div className="col-span-1 border-r border-black p-2 space-y-1">
              <div className="font-bold text-xs bg-gray-100 -m-2 mb-2 p-1 border-b border-black">Shipp To</div>
              <div className="font-bold">{employee?.name}</div>
            </div>
            <div className="col-span-1 text-xs flex flex-col justify-between">
              <div className="grid grid-cols-2 border-b border-black p-2 gap-y-1">
                <span className="font-semibold">Inv. No. :</span><span>{expense.id}</span>
                <span className="font-semibold">Inv. Date :</span><span>{new Date(expense.expenseDate).toLocaleDateString()}</span>
              </div>
              <div className="grid grid-cols-2 p-2 gap-y-1 h-full">
                <span className="font-semibold">Vehicle Number :</span><span>{expense.vehicleNumber || "N/A"}</span>
              </div>
            </div>
          </div>

          <table className="w-full border-collapse border border-black text-xs text-center mb-0">
            <thead className="bg-blue-50/50">
              <tr>
                <th className="border border-black p-1 w-8">Sr</th>
                <th className="border border-black p-1 text-left">Goods & Service Description</th>
                <th className="border border-black p-1">HSN</th>
                <th className="border border-black p-1">Quantity</th>
                <th className="border border-black p-1">Rate</th>
                <th className="border border-black p-1 bg-blue-100/30">Taxable</th>
                <th className="border border-black p-0">
                  <div className="border-b border-black">GST</div>
                  <div className="flex"><div className="w-1/2 border-r border-black">%</div><div className="w-1/2">Amt.</div></div>
                </th>
                <th className="border border-black p-1 bg-blue-100/30">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="align-top h-8">
                <td className="border-l border-r border-black p-1">1</td>
                <td className="border-l border-r border-black p-1 text-left font-medium text-gray-800">
                  {expense.title} ({expense.category})
                  {(expense.vehicleType || expense.vehicleNumber) && (
                    <div className="text-xs text-gray-500 mt-1 font-normal">
                      Vehicle: {expense.vehicleType} {expense.vehicleNumber ? `- ${expense.vehicleNumber}` : ''}
                    </div>
                  )}
                </td>
                <td className="border-l border-r border-black p-1 text-gray-600">-</td>
                <td className="border-l border-r border-black p-1">1 Nos</td>
                <td className="border-l border-r border-black p-1">{taxableAmount.toFixed(2)}</td>
                <td className="border-l border-r border-black p-1 bg-blue-50/30 text-blue-900 font-medium">{taxableAmount.toFixed(2)}</td>
                <td className="border-l border-r border-black p-0 text-gray-600 flex justify-center">
                  <div className="w-1/2 p-1 border-r border-black">{gstPercent}%</div>
                  <div className="w-1/2 p-1">{gstAmount.toFixed(2)}</div>
                </td>
                <td className="border-l border-r border-black p-1 bg-blue-50/30 text-blue-900 font-bold">{totalAmount.toFixed(2)}</td>
              </tr>
              {/* Fill empty space */}
              {Array.from({ length: 9 }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-8">
                  <td className="border-l border-r border-black"></td>
                  <td className="border-l border-r border-black"></td>
                  <td className="border-l border-r border-black"></td>
                  <td className="border-l border-r border-black"></td>
                  <td className="border-l border-r border-black"></td>
                  <td className="border-l border-r border-black bg-blue-50/30"></td>
                  <td className="border-l border-r border-black">
                     <div className="flex h-full"><div className="w-1/2 border-r border-black"></div><div className="w-1/2"></div></div>
                  </td>
                  <td className="border-l border-r border-black bg-blue-50/30"></td>
                </tr>
              ))}
              <tr className="border border-black font-bold text-gray-800">
                <td colSpan={3} className="text-right p-1 pr-4">Sub-Total:</td>
                <td className="border-l border-r border-black p-1">1</td>
                <td className="border-l border-r border-black p-1"></td>
                <td className="border-l border-r border-black p-1 bg-blue-100/50">{taxableAmount.toFixed(2)}</td>
                <td className="border-l border-r border-black p-0">
                  <div className="flex h-full"><div className="w-1/2 border-r border-black"></div><div className="w-1/2 p-1 bg-blue-100/50">{gstAmount.toFixed(2)}</div></div>
                </td>
                <td className="border-l border-r border-black p-1 bg-blue-100/50 text-blue-900">{totalAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div className="flex border-l border-r border-b border-black text-xs">
            <div className="w-[60%] p-2 border-r border-black">
              <div className="font-bold mb-1">Our Bank Details</div>
              <div className="grid grid-cols-3 gap-1">
                <span className="font-medium text-gray-600">Holder Name :</span><span className="col-span-2 font-bold">{expense.bankHolderName || employee?.name || "AL-MAWA INTERNATIONAL"}</span>
                <span className="font-medium text-gray-600">Bank Name :</span><span className="col-span-2 font-bold">{expense.bankName || "STATE BANK OF INDIA"}</span>
                <span className="font-medium text-gray-600">Branch :</span><span className="col-span-2">{expense.branch || "Delhi"}</span>
                <span className="font-medium text-gray-600">Account No :</span><span className="col-span-2 font-bold">{expense.accountNo || "20412XXXX05"}</span>
                <span className="font-medium text-gray-600">IFSC Code :</span><span className="col-span-2">{expense.ifscCode || "SBIN003XXXX"}</span>
                <span className="font-medium text-gray-600">UPI ID :</span><span className="col-span-2">{expense.upiId || "yourid@upi"}</span>
              </div>
              <div className="mt-4">
                <span className="font-medium text-gray-600">Invoice Total in Word</span><br/>
                <span className="font-bold">Rupees {totalAmount.toFixed(2)} Only</span>
              </div>
            </div>
            <div className="w-[40%] text-right font-medium text-gray-700">
               <div className="flex border-b border-black"><div className="w-2/3 p-1 border-r border-black bg-gray-50">CGST Amt :</div><div className="w-1/3 p-1">{cgst.toFixed(2)}</div></div>
               <div className="flex border-b border-black"><div className="w-2/3 p-1 border-r border-black bg-gray-50">SGST Amt :</div><div className="w-1/3 p-1">{sgst.toFixed(2)}</div></div>
               <div className="flex border-b border-black"><div className="w-2/3 p-1 border-r border-black bg-gray-50">IGST Amt :</div><div className="w-1/3 p-1">0.00</div></div>
               <div className="flex border-b border-black"><div className="w-2/3 p-1 border-r border-black bg-gray-50">Freight Packing Charges :</div><div className="w-1/3 p-1">0.00</div></div>
               <div className="flex border-b border-black"><div className="w-2/3 p-1 border-r border-black bg-gray-50">Round off :</div><div className="w-1/3 p-1">0.00</div></div>
               <div className="flex text-sm font-bold text-blue-900"><div className="w-2/3 p-1 border-r border-black bg-blue-50/50">Total Amount :</div><div className="w-1/3 p-1 bg-blue-50/50">{totalAmount.toFixed(2)}</div></div>
            </div>
          </div>

          <div className="border-l border-r border-b border-black p-2 flex justify-between text-[11px] h-32 relative">
            <div>
              {/* Removed Declaration block */}
            </div>
            <div className="flex flex-col justify-between items-end h-full pt-1">
              <div className="font-bold text-xs uppercase tracking-wide">For, AL-MAWA INTERNATIONAL</div>
              <img src="/signature.png" alt="Signature" className="h-16 object-contain mt-auto mb-1 mr-4 mix-blend-multiply" />
              <div className="font-bold border-t border-black pt-1 px-4 text-center mt-auto">Authorised Signatory</div>
            </div>
          </div>
          
          <div className="text-center font-bold text-xs mt-2 text-gray-600">Thank You For Business With US!</div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
