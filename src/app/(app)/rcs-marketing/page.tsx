"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CircleDollarSign, Hash, Loader2, Megaphone, Pencil, Search, Save, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { deleteRcsMarketingReport, getRcsMarketingReports, saveRcsMarketingDailyReport } from "@/app/actions";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/store";

interface RcsMarketingRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  reportDate: string;
  quantity: number;
  rate: number;
  amount: number;
}

function getTodayDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function formatReportDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatAmount(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function RcsMarketingPage() {
  const user = useAuth();
  const [records, setRecords] = useState<RcsMarketingRecord[]>([]);
  const [reportDate, setReportDate] = useState(getTodayDate);
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    if (user.role !== "employee") {
      setLoading(false);
      return;
    }

    const userRole = user.role;
    const employeeId = user.employeeId || user.id;
    let cancelled = false;
    async function loadReports() {
      const result = await getRcsMarketingReports(userRole, employeeId);
      if (cancelled) return;
      if (result.success) {
        setRecords(result.records as RcsMarketingRecord[]);
      } else {
        toast.error(result.error || "Failed to load RCS Marketing updates");
      }
      setLoading(false);
    }
    loadReports().catch((error: unknown) => {
      console.error("Failed to load RCS Marketing updates:", error);
      if (!cancelled) {
        toast.error("Failed to load RCS Marketing updates");
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const selectedRecord = records.find((record) => record.reportDate === reportDate);
    setQuantity(selectedRecord ? String(selectedRecord.quantity) : "");
    setRate(selectedRecord ? String(selectedRecord.rate) : "");
    setAmount(selectedRecord ? String(selectedRecord.amount) : "");
  }, [reportDate, records]);

  async function saveDailyUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || user.role !== "employee") return;

    const values = [quantity, rate, amount].map(Number);
    if ([quantity, rate, amount].some((value) => value.trim() === "") ||
        values.some((value) => !Number.isFinite(value) || value < 0)) {
      toast.error("Enter valid non-negative values for quantity, rate, and amount");
      return;
    }

    setSaving(true);
    try {
      const result = await saveRcsMarketingDailyReport(
        { reportDate, quantity: values[0], rate: values[1], amount: values[2] },
        user.employeeId || user.id,
        user.role
      );
      if (!result.success || !result.report) {
        toast.error(result.error || "Failed to save RCS Marketing update");
        return;
      }

      const updatedRecord = result.report as RcsMarketingRecord;
      setRecords((current) => [
        updatedRecord,
        ...current.filter((record) => record.reportDate !== updatedRecord.reportDate),
      ].sort((a, b) => b.reportDate.localeCompare(a.reportDate)));
      setEditingDate(null);
      toast.success("Daily RCS Marketing update saved");
    } catch (error) {
      console.error("Failed to save RCS Marketing update:", error);
      toast.error("Failed to save RCS Marketing update");
    } finally {
      setSaving(false);
    }
  }

  function editRecord(record: RcsMarketingRecord) {
    setReportDate(record.reportDate);
    setQuantity(String(record.quantity));
    setRate(String(record.rate));
    setAmount(String(record.amount));
    setEditingDate(record.reportDate);
  }

  function cancelEdit() {
    setEditingDate(null);
    setReportDate(getTodayDate());
  }

  async function deleteRecord(record: RcsMarketingRecord) {
    if (!user || user.role !== "employee") return;
    if (!window.confirm(`Delete your RCS Marketing update for ${record.reportDate}?`)) return;

    try {
      const result = await deleteRcsMarketingReport(record.id, user.employeeId || user.id, user.role);
      if (!result.success) {
        toast.error(result.error || "Failed to delete RCS Marketing update");
        return;
      }
      setRecords((current) => current.filter((item) => item.id !== record.id));
      if (editingDate === record.reportDate) {
        setEditingDate(null);
        setReportDate(getTodayDate());
      }
      toast.success("Daily RCS Marketing update deleted");
    } catch (error) {
      console.error("Failed to delete RCS Marketing update:", error);
      toast.error("Failed to delete RCS Marketing update");
    }
  }

  if (!user) return null;
  if (user.role !== "employee") {
    return <div className="p-8 text-center text-muted-foreground">This page is available to employees only.</div>;
  }

  const filteredRecords = records.filter((record) =>
    `${record.reportDate} ${record.quantity} ${record.rate} ${record.amount}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );
  const totalQuantity = records.reduce((total, record) => total + record.quantity, 0);
  const totalAmount = records.reduce((total, record) => total + record.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="RCS Marketing"
        description="Track your daily RCS campaign activity and results."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Send className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Daily updates</p>
              <p className="text-2xl font-bold tabular-nums">{records.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sky-500/10 text-sky-600">
              <Hash className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Total quantity</p>
              <p className="text-2xl font-bold tabular-nums">{totalQuantity.toLocaleString("en-IN")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <CircleDollarSign className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Total amount</p>
              <p className="text-2xl font-bold tabular-nums">{formatAmount(totalAmount)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Megaphone className="h-5 w-5" />
            </span>
            <span>{editingDate ? "Edit Daily Update" : "Submit Daily Update"}</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Record one update per day. You can edit your entry later if needed.
          </p>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          <form onSubmit={saveDailyUpdate} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="reportDate">Update date</Label>
                <Input
                  id="reportDate"
                  type="date"
                  max={getTodayDate()}
                  value={reportDate}
                  onChange={(event) => setReportDate(event.target.value)}
                  disabled={editingDate !== null}
                  required
                />
                {editingDate && <p className="text-xs text-muted-foreground">Date cannot be changed while editing.</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 250"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate">Rate</Label>
                <Input
                  id="rate"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 2.50"
                  value={rate}
                  onChange={(event) => setRate(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 625.00"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button type="submit" disabled={saving || loading}>
                {saving ? <Loader2 className="animate-spin" /> : editingDate ? <Pencil /> : <Save />}
                {saving ? "Saving..." : editingDate ? "Update Entry" : "Save Daily Update"}
              </Button>
              {editingDate && (
                <Button type="button" variant="outline" onClick={cancelEdit} disabled={saving}>
                  <X />
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b bg-muted/20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              My Daily Update History
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Review and manage your previous entries.</p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="bg-background pl-9"
              placeholder="Search date or values..."
              aria-label="Search daily RCS updates"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="pl-6">Report date</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-primary" />
                      Loading updates...
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center">
                      <CalendarDays className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                      <p className="font-medium">{search ? "No matching updates" : "No daily updates yet"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {search ? "Try another search term." : "Your submitted updates will appear here."}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="whitespace-nowrap pl-6 font-medium">{formatReportDate(record.reportDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{record.quantity.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatAmount(record.rate)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatAmount(record.amount)}</TableCell>
                    <TableCell><Badge variant="secondary" className="font-medium">Submitted</Badge></TableCell>
                    <TableCell className="whitespace-nowrap pr-6 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => editRecord(record)}
                        disabled={saving}
                        aria-label={`Edit update for ${record.reportDate}`}
                        title="Edit update"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteRecord(record)}
                        disabled={saving}
                        aria-label={`Delete update for ${record.reportDate}`}
                        title="Delete update"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
