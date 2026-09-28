"use client";

import { useAuth } from "@/lib/store";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { HRDashboard } from "@/components/dashboard/HRDashboard";
import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard";
import { SalesDashboard } from "@/components/dashboard/SalesDashboard";

export default function Dashboard() {
  const user = useAuth();
  
  if (!user) return null;

  if (user.role === "admin") {
    return <AdminDashboard />;
  }

  if (user.role === "hr") {
    return <HRDashboard />;
  }

  if (user.role === "employee" && user.jobRole === "Sales") {
    return <SalesDashboard />;
  }

  return <EmployeeDashboard />;
}
