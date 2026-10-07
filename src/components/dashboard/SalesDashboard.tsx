"use client";

import { useAuth, useDB } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, PhoneCall, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export function SalesDashboard() {
  const user = useAuth();
  const db = useDB();

  if (!user || user.role !== "employee" || user.jobRole !== "Sales") return null;

  const today = format(new Date(), "yyyy-MM-dd");

  const myLeads = db.leads?.filter(l => l.employeeId === (user.employeeId || user.id)) || [];
  
  const totalLeads = myLeads.length;
  const todaysLeads = myLeads.filter(l => l.createdAt?.startsWith(today)).length;
  
  const positiveCustomers = myLeads.filter(l => l.leadStatus === "POSITIVE");
  const totalPositive = positiveCustomers.length;
  const todaysPositive = positiveCustomers.filter(l => l.createdAt?.startsWith(today)).length;

  const myReports = db.dailyReports?.filter(r => r.employeeId === (user.employeeId || user.id)) || [];
  const todaysReport = myReports.find(r => r.reportDate === today);
  const totalFollowUps = myReports.reduce((acc, curr) => acc + (curr.followUps || 0), 0);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">Sales Overview</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">+{todaysLeads} today</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Positive Customers</CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPositive}</div>
            <p className="text-xs text-muted-foreground mt-1">+{todaysPositive} today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Follow-ups</CardTitle>
            <PhoneCall className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFollowUps}</div>
            <p className="text-xs text-muted-foreground mt-1">From all sales reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Report</CardTitle>
            <CheckCircle className={`h-4 w-4 ${todaysReport ? 'text-emerald-500' : 'text-amber-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaysReport ? "Submitted" : "Pending"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {todaysReport ? "You have submitted today's report" : "Don't forget to submit"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
