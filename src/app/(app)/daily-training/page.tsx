"use client";

import { useState, useEffect } from "react";
import { useAuth, useDB } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { GraduationCap, Calendar, CheckCircle2, Clock, AlertCircle, FileCheck, Loader2 } from "lucide-react";
import { getDailyTrainingToday, submitDailyTraining } from "@/app/actions";
import { useRouter } from "next/navigation";

export default function DailyTrainingPage() {
  const user = useAuth();
  const db = useDB();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<any>(null);
  const [todayDateStr, setTodayDateStr] = useState<string>("");
  const [content, setContent] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if current user is Sales
  const currentEmp = db.employees?.find((e) => e.id === (user?.employeeId || user?.id));
  const isSales =
    user?.jobRole === "Sales" ||
    currentEmp?.jobRole === "Sales" ||
    (currentEmp?.designation && currentEmp.designation.toLowerCase().includes("sales"));

  useEffect(() => {
    if (!user) return;
    if (user.role === "employee" && !isSales) {
      // Non-sales employees should not access this module
      return;
    }

    async function loadTodayStatus() {
      setLoading(true);
      try {
        const empId = user?.employeeId || user?.id || "";
        const res = await getDailyTrainingToday(empId);
        if (res.success) {
          setTodayDateStr(res.today || "");
          if (res.submitted && res.report) {
            setSubmittedReport(res.report);
          }
        }
      } catch (err) {
        console.error("Failed to load today's training status:", err);
      } finally {
        setLoading(false);
      }
    }

    loadTodayStatus();
  }, [user, isSales]);

  if (!user) return null;

  if (user.role === "employee" && !isSales) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center space-y-4">
        <div className="h-12 w-12 rounded-2xl bg-muted grid place-items-center mx-auto text-muted-foreground">
          <GraduationCap className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold">Sales Training Module</h2>
        <p className="text-sm text-muted-foreground">
          This daily training module is configured specifically for Sales team employees.
        </p>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  // Format date display
  const displayDate = todayDateStr
    ? new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
      }).format(new Date(todayDateStr + "T00:00:00"))
    : new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
      }).format(new Date());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    const points = content
      .split(/\r?\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (points.length === 0) {
      setErrorMessage("Please enter at least one training point. Empty or whitespace submissions are not accepted.");
      return;
    }

    setSubmitting(true);
    try {
      const empId = user?.employeeId || user?.id || "";
      const res = await submitDailyTraining({
        employeeId: empId,
        trainingDate: todayDateStr,
        trainingPoints: points,
        rawContent: content
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to submit training report");
        toast.error(res.error || "Submission failed");
        setSubmitting(false);
        return;
      }

      toast.success("Daily training submitted successfully!");
      setSubmittedReport(res.report);
      setContent("");
    } catch (err: any) {
      console.error("Submission error:", err);
      setErrorMessage("Network or server error while submitting report. Please try again.");
      toast.error("Network or server error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center text-primary">
              <GraduationCap className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Daily Training</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Submit your daily training points, learned sales techniques, product updates, and key takeaways.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border shadow-sm text-xs font-medium text-muted-foreground self-start sm:self-auto">
          <Calendar className="h-4 w-4 text-primary" />
          <span>{displayDate}</span>
        </div>
      </div>

      {loading ? (
        <Card className="border">
          <CardContent className="py-16 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Checking today&apos;s training status...</p>
          </CardContent>
        </Card>
      ) : submittedReport ? (
        /* Read-only view of today's submission */
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-lg font-bold">Today&apos;s Training Submitted</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Your daily training report has been recorded. Only one submission is permitted per working day.
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 px-3 py-1 font-semibold self-start sm:self-auto">
                Status: {submittedReport.status || "Submitted"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-muted/30 rounded-xl border text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px] mb-0.5">Training Date</span>
                <span className="font-semibold text-foreground">{submittedReport.trainingDate}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] mb-0.5">Submitted At</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {new Date(submittedReport.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] mb-0.5">Employee</span>
                <span className="font-semibold text-foreground">{submittedReport.employeeName} ({submittedReport.employeeId})</span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-primary" /> Submitted Training Points
              </h3>

              <div className="space-y-2">
                {submittedReport.trainingPoints && submittedReport.trainingPoints.length > 0 ? (
                  submittedReport.trainingPoints.map((point: string, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-background border rounded-xl flex items-start gap-3 shadow-xs"
                    >
                      <span className="h-5 w-5 rounded-full bg-primary/10 text-primary font-bold text-xs grid place-items-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                        {point}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">No training points recorded.</p>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                <strong>Requirement satisfied:</strong> Your training for today is complete. You can proceed with regular logout at the end of your shift.
              </span>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Training Submission Form */
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <CardTitle className="text-lg font-bold">Submit Today&apos;s Training Report</CardTitle>
            <CardDescription className="text-xs">
              Every Sales employee must log today&apos;s training details before signing out.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMessage && (
                <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-3.5 rounded-xl flex items-center gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Training Date field (read-only/auto-selected to today) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Training Date</Label>
                  <div className="h-10 px-3 rounded-lg border bg-muted/40 flex items-center gap-2 text-xs font-medium">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{displayDate}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Submissions are linked to today&apos;s working date. Future date selection is prohibited.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Employee Details</Label>
                  <div className="h-10 px-3 rounded-lg border bg-muted/40 flex items-center gap-2 text-xs font-medium text-foreground">
                    <span className="font-semibold">{user.name}</span>
                    <span className="text-muted-foreground font-mono">({user.employeeId || user.id})</span>
                    <Badge variant="outline" className="ml-auto text-[10px] py-0">Sales</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Authenticated session employee.
                  </p>
                </div>
              </div>

              {/* Training Points Multiline Textarea */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="training-points-input" className="text-xs font-semibold">
                    Training Points <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Enter approximately 5–6 points (1 point per line)
                  </span>
                </div>
                <Textarea
                  id="training-points-input"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  disabled={submitting}
                  className="resize-y min-h-[180px] text-sm leading-relaxed"
                  placeholder={`Enter today's training points, topics learned, product knowledge, sales techniques, tasks practiced, or lessons learned...

Example:
1. Learned product features and specifications.
2. Practiced explaining product benefits to customers.
3. Studied customer objection-handling techniques.
4. Reviewed lead follow-up procedures.
5. Practiced preparing quotations.
6. Learned the daily sales reporting process.`}
                />
                <p className="text-[11px] text-muted-foreground">
                  Each separate line will be recorded as an individual training point. Please ensure meaningful entries without empty lines.
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t">
                <div className="text-xs text-muted-foreground">
                  * Only one final training submission is allowed per employee per date.
                </div>
                <Button
                  type="submit"
                  disabled={submitting || !content.trim()}
                  className="w-full sm:w-auto px-6 font-semibold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting Training...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Submit Training
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
