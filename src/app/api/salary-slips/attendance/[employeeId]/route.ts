import { NextRequest, NextResponse } from "next/server";
import { calculateEmployeeAttendanceSalary } from "@/lib/payroll-service";
import { getPayrollActor } from "@/lib/payroll-auth";
import connectDB from "@/lib/mongoose";

function invalidPeriod(value: string | null, label: string, min: number, max: number) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${label} is invalid`);
  return number;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  try {
    await connectDB();
    const actor = getPayrollActor(request);
    const { employeeId } = await params;
    if (actor.role === "employee" && actor.id.replace(/^u_/, "") !== employeeId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }
    const month = invalidPeriod(request.nextUrl.searchParams.get("month"), "Month", 1, 12);
    const year = invalidPeriod(request.nextUrl.searchParams.get("year"), "Year", 2000, 2200);
    const calculation = await calculateEmployeeAttendanceSalary(employeeId, month, year);
    return NextResponse.json({ success: true, data: calculation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Attendance payroll request failed";
    const status = message === "Employee not found" ? 404 : /Unauthorized/.test(message) ? 403 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
