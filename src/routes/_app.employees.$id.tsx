import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useDB } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, Building2, Calendar, Briefcase, IndianRupee } from "lucide-react";
import { StatusBadge } from "./_app.dashboard";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export const Route = createFileRoute("/_app/employees/$id")({
  component: EmployeeDetail,
});

function EmployeeDetail() {
  const { id } = useParams({ from: "/_app/employees/$id" });
  const db = useDB();
  const emp = db.employees.find((e) => e.id === id);
  if (!emp) return <div className="text-center py-20 text-muted-foreground">Employee not found.</div>;

  const att = db.attendance.filter((a) => a.employeeId === id).sort((a, b) => b.date.localeCompare(a.date));
  const tasks = db.tasks.filter((t) => t.assignedTo === id);
  const activities = db.activities.filter((a) => a.employeeId === id);

  const perfData = att.slice(0, 10).reverse().map((a) => ({ date: a.date.slice(5), productivity: a.productivity }));

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-4"><Link to="/employees"><ArrowLeft className="h-4 w-4 mr-2" />Back to Employees</Link></Button>
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="h-32" style={{ background: "var(--gradient-primary)" }} />
        <CardContent className="pt-0 -mt-12">
          <div className="flex flex-col md:flex-row gap-6 md:items-end">
            <Avatar className="h-24 w-24 ring-4 ring-card">
              <AvatarImage src={emp.avatar} /><AvatarFallback>{emp.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold">{emp.name}</h2>
              <p className="text-muted-foreground">{emp.designation} • {emp.department}</p>
            </div>
            <StatusBadge status={emp.status} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle>Employee Information</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              {[
                { i: Mail, l: "Email", v: emp.email },
                { i: Phone, l: "Mobile", v: emp.mobile },
                { i: Building2, l: "Department", v: emp.department },
                { i: Briefcase, l: "Designation", v: emp.designation },
                { i: Calendar, l: "Joining Date", v: emp.joiningDate },
                { i: IndianRupee, l: "Salary", v: `₹ ${emp.salary.toLocaleString()}` },
              ].map(({ i: I, l, v }) => (
                <div key={l} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center"><I className="h-4 w-4" /></div>
                  <div><div className="text-xs text-muted-foreground">{l}</div><div className="font-medium">{v}</div></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <Card className="border-0 shadow-sm"><CardContent className="p-4 md:p-6">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Login</TableHead><TableHead>Logout</TableHead><TableHead>Hours</TableHead><TableHead>Status</TableHead><TableHead>Productivity</TableHead></TableRow></TableHeader>
              <TableBody>
                {att.slice(0, 20).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.date}</TableCell><TableCell>{a.loginTime || "—"}</TableCell><TableCell>{a.logoutTime || "—"}</TableCell>
                    <TableCell>{a.workingHours}h</TableCell><TableCell><StatusBadge status={a.status} /></TableCell><TableCell>{a.productivity}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <Card className="border-0 shadow-sm"><CardContent className="p-4 md:p-6">
            <Table>
              <TableHeader><TableRow><TableHead>Task</TableHead><TableHead>Priority</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead>Progress</TableHead></TableRow></TableHeader>
              <TableBody>
                {tasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell><TableCell><StatusBadge status={t.priority} /></TableCell>
                    <TableCell>{t.dueDate}</TableCell><TableCell><StatusBadge status={t.status} /></TableCell><TableCell>{t.progress}%</TableCell>
                  </TableRow>
                ))}
                {tasks.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No tasks assigned.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card className="border-0 shadow-sm"><CardContent className="p-6">
            <ol className="relative border-l border-border ml-3 space-y-4">
              {activities.length === 0 && <div className="text-sm text-muted-foreground">No activity recorded.</div>}
              {activities.map((a) => (
                <li key={a.id} className="ml-4">
                  <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-primary mt-1.5" />
                  <time className="text-xs text-muted-foreground">{new Date(a.time).toLocaleString()}</time>
                  <p className="text-sm font-medium">{a.label}</p>
                </li>
              ))}
            </ol>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle>Productivity Trend</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={perfData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="productivity" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
