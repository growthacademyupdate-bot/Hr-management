import { createFileRoute } from "@tanstack/react-router";
import { useAuth, useDB } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { LogIn, LogOut, Coffee, Play, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_app/activity")({
  component: ActivityPage,
});

const ICONS = { login: LogIn, logout: LogOut, break: Coffee, task: Play, complete: CheckCircle2 };
const COLORS: Record<string, string> = {
  login: "bg-success/10 text-success", logout: "bg-destructive/10 text-destructive",
  break: "bg-warning/10 text-warning", task: "bg-info/10 text-info", complete: "bg-primary/10 text-primary",
};

function ActivityPage() {
  const user = useAuth();
  const db = useDB();
  const acts = user?.role === "employee"
    ? db.activities.filter((a) => a.employeeId === user.employeeId)
    : db.activities;

  return (
    <div>
      <PageHeader title="Activity Timeline" description="Realtime activity events" />
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <ol className="relative border-l-2 border-border ml-3 space-y-6">
            {acts.length === 0 && <p className="text-sm text-muted-foreground">No activity recorded.</p>}
            {acts.slice(0, 50).map((a) => {
              const Icon = ICONS[a.type] || Play;
              const emp = db.employees.find((e) => e.id === a.employeeId);
              return (
                <li key={a.id} className="ml-6 relative">
                  <span className={`absolute -left-[34px] h-7 w-7 rounded-full grid place-items-center ring-4 ring-card ${COLORS[a.type]}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{a.label}</p>
                      {user?.role !== "employee" && emp && <p className="text-xs text-muted-foreground">{emp.name} • {emp.id}</p>}
                    </div>
                    <time className="text-xs text-muted-foreground">{new Date(a.time).toLocaleString()}</time>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
