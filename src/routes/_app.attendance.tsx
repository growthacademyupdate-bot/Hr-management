import { createFileRoute } from "@tanstack/react-router";
import { useAuth, useDB } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "./_app.dashboard";

export const Route = createFileRoute("/_app/attendance")({
  component: AttendancePage,
});

function AttendancePage() {
  const user = useAuth();
  const db = useDB();
  const today = new Date().toISOString().slice(0, 10);

  const isEmp = user?.role === "employee";
  const records = isEmp
    ? db.attendance.filter((a) => a.employeeId === user!.employeeId)
    : db.attendance;

  const byPeriod = (days: number) => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    return records.filter((r) => new Date(r.date) >= cutoff).sort((a, b) => b.date.localeCompare(a.date));
  };

  function findEmp(id: string) { return db.employees.find((e) => e.id === id); }

  function renderTable(list: typeof records) {
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {!isEmp && <TableHead>Employee</TableHead>}
              <TableHead>Date</TableHead>
              <TableHead>Login</TableHead>
              <TableHead>Logout</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Productivity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.slice(0, 50).map((a) => {
              const emp = findEmp(a.employeeId);
              return (
                <TableRow key={a.id}>
                  {!isEmp && emp && (
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8"><AvatarImage src={emp.avatar} /><AvatarFallback>{emp.name[0]}</AvatarFallback></Avatar>
                        <div><div className="text-sm font-medium">{emp.name}</div><div className="text-xs text-muted-foreground">{emp.id}</div></div>
                      </div>
                    </TableCell>
                  )}
                  <TableCell>{a.date}</TableCell>
                  <TableCell>{a.loginTime || "—"}</TableCell>
                  <TableCell>{a.logoutTime || "—"}</TableCell>
                  <TableCell>{a.logoutTime ? `${a.workingHours}h` : "—"}</TableCell>
                  <TableCell><StatusBadge status={a.status} /></TableCell>
                  <TableCell>{a.logoutTime ? `${a.productivity}%` : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Attendance" description={isEmp ? "Your attendance history" : "Organization-wide attendance"} />
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 md:p-6">
          <Tabs defaultValue="daily">
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
            <TabsContent value="daily" className="mt-4">{renderTable(records.filter((r) => r.date === today))}</TabsContent>
            <TabsContent value="weekly" className="mt-4">{renderTable(byPeriod(7))}</TabsContent>
            <TabsContent value="monthly" className="mt-4">{renderTable(byPeriod(30))}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
