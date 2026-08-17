import { createFileRoute } from "@tanstack/react-router";
import { useDB } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const db = useDB();
  const today = new Date().toISOString().slice(0, 10);
  const todayAtt = db.attendance.filter((a) => a.date === today);

  const attendanceTrend = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    const date = d.toISOString().slice(0, 10);
    const recs = db.attendance.filter((a) => a.date === date);
    return { day: d.getDate(), present: recs.filter(r => r.status === "Present").length };
  });

  const taskCompletion = [
    { name: "Completed", value: db.tasks.filter(t => t.status === "Completed").length, fill: "var(--color-success)" },
    { name: "In Progress", value: db.tasks.filter(t => t.status === "In Progress").length, fill: "var(--color-info)" },
    { name: "Pending", value: db.tasks.filter(t => t.status === "Pending").length, fill: "var(--color-warning)" },
  ];

  const topPerformers = [...db.employees]
    .map((e) => {
      const recs = db.attendance.filter((a) => a.employeeId === e.id);
      const avg = recs.length ? Math.round(recs.reduce((s, r) => s + r.productivity, 0) / recs.length) : 0;
      return { name: e.name.split(" ")[0], productivity: avg };
    })
    .sort((a, b) => b.productivity - a.productivity)
    .slice(0, 8);

  function exportNotice(kind: string) { toast.info(`${kind} export coming soon`); }

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" description="Insights across attendance, tasks, and productivity"
        actions={<>
          <Button variant="outline" onClick={() => exportNotice("PDF")}><FileText className="h-4 w-4 mr-2" />Export PDF</Button>
          <Button onClick={() => exportNotice("Excel")}><FileSpreadsheet className="h-4 w-4 mr-2" />Export Excel</Button>
        </>}
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle>Attendance Report (14 days)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="present" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle>Task Completion</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={taskCompletion} dataKey="value" nameKey="name" outerRadius={90}>
                  {taskCompletion.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader><CardTitle>Top Performers</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPerformers}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar dataKey="productivity" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle>Productivity Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryStat label="Total Hours (today)" value={`${todayAtt.reduce((s, a) => s + a.workingHours, 0).toFixed(1)}h`} />
            <SummaryStat label="Avg Hours / Employee" value={`${(todayAtt.reduce((s, a) => s + a.workingHours, 0) / Math.max(todayAtt.length, 1)).toFixed(1)}h`} />
            <SummaryStat label="Avg Productivity" value={`${Math.round(todayAtt.reduce((s, a) => s + a.productivity, 0) / Math.max(todayAtt.length, 1))}%`} />
            <SummaryStat label="Tasks Completed" value={db.tasks.filter(t => t.status === "Completed").length} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-4 bg-muted/40 rounded-xl">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
