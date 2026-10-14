"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { GraduationCap, AlertCircle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { submitDailyTraining } from "@/app/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface MandatoryTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  onSuccess: () => void;
}

export function MandatoryTrainingModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  onSuccess,
}: MandatoryTrainingModalProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Today formatted
  const todayDisplay = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const points = content
      .split(/\r?\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (points.length === 0) {
      setError("Please enter at least one meaningful training point (5-6 points recommended).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitDailyTraining({
        employeeId,
        trainingPoints: points,
        rawContent: content,
      });

      if (!res.success) {
        setError(res.error || "Failed to submit training report");
        toast.error(res.error || "Submission failed");
        setSubmitting(false);
        return;
      }

      toast.success("Daily training submitted successfully! Proceeding with logout...");
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError("Network or server error while submitting training. Please try again.");
      toast.error("Network or server error");
    } finally {
      setSubmitting(false);
    }
  }

  function handleGoToTrainingPage() {
    onClose();
    router.push("/daily-training");
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !submitting) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-xl w-full p-0 overflow-hidden sm:rounded-2xl border bg-background shadow-2xl">
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b bg-muted/20">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 grid place-items-center shrink-0">
                <GraduationCap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
                  Mandatory Daily Training
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Working Date: <span className="font-semibold text-foreground">{todayDisplay}</span>
                </p>
              </div>
            </div>

            {/* Mandatory Alert Banner */}
            <DialogDescription className="text-xs text-amber-800 dark:text-amber-200 bg-amber-500/10 border border-amber-500/25 p-3 rounded-xl flex items-start gap-2.5 text-left leading-relaxed">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>Submission required before logout:</strong> Please enter today&apos;s training points to complete your daily sign-off and continue.
              </span>
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 pt-5 space-y-4">
          {error && (
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <Label htmlFor="mandatory-points" className="font-semibold text-foreground">
                Today&apos;s Training Points <span className="text-destructive">*</span>
              </Label>
              <span className="text-muted-foreground text-[11px] bg-muted/60 px-2 py-0.5 rounded-md">
                1 point per line • Recommended 5–6 points
              </span>
            </div>

            <Textarea
              id="mandatory-points"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={submitting}
              className="resize-none h-44 text-xs leading-relaxed font-normal bg-background border-input focus-visible:ring-primary rounded-xl"
              placeholder={`Enter today's training points, topics learned, product knowledge, or sales techniques...

Example:
1. Learned product features and specifications
2. Practiced explaining product benefits to customers
3. Studied customer objection-handling techniques
4. Reviewed lead follow-up procedures
5. Practiced preparing quotations`}
            />
          </div>

          {/* Clean Action Buttons Footer */}
          <div className="pt-3 border-t flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGoToTrainingPage}
              disabled={submitting}
              className="w-full sm:w-auto text-xs h-9 rounded-xl text-muted-foreground hover:text-foreground"
            >
              Open Daily Training Page <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 sm:flex-initial text-xs h-9 rounded-xl"
              >
                Cancel Logout
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || !content.trim()}
                className="flex-1 sm:flex-initial text-xs h-9 rounded-xl font-semibold px-4 shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Submit & Logout
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
