import { createFileRoute } from "@tanstack/react-router";
import { useAuth, useDB } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Phone, Building2, Briefcase, Calendar, IndianRupee, BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const user = useAuth();
  const db = useDB();
  const emp = user?.employeeId ? db.employees.find((e) => e.id === user.employeeId) : null;

  return (
    <div>
      <PageHeader title="My Profile" description="Personal information" />
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="h-32" style={{ background: "var(--gradient-primary)" }} />
        <CardContent className="pt-0 -mt-12">
          <div className="flex flex-col md:flex-row gap-6 md:items-end">
            <Avatar className="h-24 w-24 ring-4 ring-card">
              <AvatarImage src={user?.avatar} /><AvatarFallback>{user?.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">{user?.name} <BadgeCheck className="h-5 w-5 text-primary" /></h2>
              <p className="text-muted-foreground capitalize">{user?.role} • {user?.email}</p>
            </div>
          </div>

          {emp && (
            <div className="grid md:grid-cols-2 gap-3 mt-8">
              {[
                { i: Mail, l: "Email", v: emp.email },
                { i: Phone, l: "Mobile", v: emp.mobile },
                { i: Building2, l: "Department", v: emp.department },
                { i: Briefcase, l: "Designation", v: emp.designation },
                { i: Calendar, l: "Joining Date", v: emp.joiningDate },
                { i: IndianRupee, l: "Salary", v: `₹ ${emp.salary.toLocaleString()}` },
              ].map(({ i: I, l, v }) => (
                <div key={l} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center"><I className="h-4 w-4" /></div>
                  <div><div className="text-xs text-muted-foreground">{l}</div><div className="font-medium">{v}</div></div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
