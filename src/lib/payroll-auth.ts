import { NextRequest } from "next/server";

export type PayrollActor = { id: string; role: "admin" | "hr" | "employee" };

export function getPayrollActor(request: NextRequest): PayrollActor {
  const role = request.headers.get("x-user-role") as PayrollActor["role"] | null;
  const id = request.headers.get("x-user-id");
  if (!role || !id || !["admin", "hr", "employee"].includes(role)) throw new Error("Authentication required");
  return { id, role };
}

export function requirePayrollManager(actor: PayrollActor) {
  if (actor.role !== "admin" && actor.role !== "hr") throw new Error("Only HR or Admin can manage payroll");
}
