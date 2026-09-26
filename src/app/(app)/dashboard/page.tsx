"use client";

import { useAuth } from "@/lib/store";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { HRDashboard } from "@/components/dashboard/HRDashboard";
import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard";

export default function Dashboard() {
  const user = useAuth();
  
  if (!user) return null;

  if (user.role === "admin") {
    return <AdminDashboard />;
  }

  if (user.role === "hr") {
    return <HRDashboard />;
  }

  return <EmployeeDashboard />;
}
