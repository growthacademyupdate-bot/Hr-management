"use client";

import { useEffect, useState } from "react";
import { CircleDollarSign, Hash, Loader2, Megaphone, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { getRcsMarketingReports } from "@/app/actions";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

export default function RcsMarketingReportsPage() {
  const user = useAuth();
  const [records, setRecords] = useState<RcsMarketingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    if (user.role !== "admin") {
      setLoading(false);
      return;
    }

    const userRole = user.role;
    let cancelled = false;
    async function loadReports() {
      const result = await getRcsMarketingReports(userRole);
      if (cancelled) return;
      if (result.success) {
        setRecords(result.records as RcsMarketingRecord[]);
      } else {
        toast.error(result.error || "Failed to load RCS Marketing reports");
      }
      setLoading(false);
    }
    loadReports().catch((error: unknown) => {
      console.error("Failed to load RCS Marketing reports:", error);
      if (!cancelled) {
        toast.error("Failed to load RCS Marketing reports");
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;
  if (user.role !== "admin") {
    return <div className="p-8 text-center text-muted-foreground">Only admins can view RCS Marketing reports.</div>;
  }

  const filteredRecords = records.filter((record) =>
    `${record.employeeName} ${record.employeeId} ${record.reportDate} ${record.quantity} ${record.rate} ${record.amount}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );
  const totalQuantity = records.reduce((total, record) => total + record.quantity, 0);
  const totalAmount = records.reduce((total, record) => total + record.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="RCS Marketing Reports"
        description="Monitor employee campaign activity and daily results."
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
        <CardHeader className="flex flex-col gap-4 border-b bg-muted/20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Employee Daily Updates
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              A date-wise view of submitted RCS marketing activity.
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="bg-background pl-9"
              placeholder="Search employee or date..."
              aria-label="Search RCS Marketing reports"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[780px]">
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="pl-6">Report date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="pr-6 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                      <span className="mt-2 block text-sm text-muted-foreground">Loading RCS Marketing reports...</span>
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center">
                      <Megaphone className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                      <p className="font-medium">{search ? "No matching reports" : "No employee updates yet"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {search ? "Try another search term." : "Submitted employee updates will appear here."}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="whitespace-nowrap pl-6 font-medium">{formatReportDate(record.reportDate)}</TableCell>
                    <TableCell className="font-medium">{record.employeeName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{record.employeeId}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{record.quantity.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatAmount(record.rate)}</TableCell>
                    <TableCell className="pr-6 text-right font-semibold tabular-nums">{formatAmount(record.amount)}</TableCell>
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
