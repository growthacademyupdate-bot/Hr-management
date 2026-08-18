"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDB } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, Calendar, Briefcase, IndianRupee, ShieldCheck } from "lucide-react";
import { StatusBadge } from "../../dashboard/page";

export default function EmployeeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const db = useDB();
  
  // Unwrap params using React.use()
  const { id } = use(params);
  
  const emp = db.employees.find((e) => e.id === id);

  if (!emp) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-2xl font-bold">Employee Not Found</h2>
        <p className="text-muted-foreground">The employee you are looking for does not exist or has been deleted.</p>
        <Button onClick={() => router.push("/employees")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Employees
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Employee Profile" 
        description={`Detailed information for ${emp.name}`} 
        actions={
          <Button variant="outline" onClick={() => router.push("/employees")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm md:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
            <Avatar className="h-32 w-32 mb-2">
              <AvatarImage src={emp.avatar} />
              <AvatarFallback className="text-4xl">{emp.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-2xl font-bold">{emp.name}</h3>
              <p className="text-muted-foreground font-medium mt-1">{emp.designation}</p>
              <div className="mt-3 flex justify-center"><StatusBadge status={emp.status} /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle>Contact & Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email Address</p>
                  <p className="font-medium">{emp.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Mobile Number</p>
                  <p className="font-medium">{emp.mobile}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Department</p>
                  <p className="font-medium">{emp.department}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Joining Date</p>
                  <p className="font-medium">{emp.joiningDate}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <IndianRupee className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Salary</p>
                  <p className="font-medium">₹{emp.salary?.toLocaleString() || "Not specified"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Employee ID</p>
                  <p className="font-medium uppercase">{emp.id}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
