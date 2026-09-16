import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import { SalarySlip } from "@/models/SalarySlip";
import { Employee } from "@/models/Employee";
import { getPayrollActor, requirePayrollManager } from "@/lib/payroll-auth";
import { saveSalarySlip } from "@/lib/payroll-service";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Payroll request failed";
  const status = /Authentication|Only HR|Unauthorized/.test(message) ? 403 : /already exists|duplicate|E11000/i.test(message) ? 409 : 400;
  return NextResponse.json({ success: false, error: /E11000|duplicate/i.test(message) ? "A salary slip already exists for this employee and payroll period" : message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const actor = getPayrollActor(request);
    const params = request.nextUrl.searchParams;
    const query: Record<string, unknown> = {};
    if (actor.role === "employee") query.employeeId = actor.id.replace(/^u_/, "");
    else if (params.get("employeeId")) query.employeeId = params.get("employeeId");
    if (params.get("salaryMonth")) query.salaryMonth = Number(params.get("salaryMonth"));
    if (params.get("salaryYear")) query.salaryYear = Number(params.get("salaryYear"));
    if (params.get("department")) {
      const employees = await Employee.find({ department: params.get("department") }).select({ id: 1 }).lean();
      query.employeeId = { $in: employees.map((employee) => employee.id) };
    }
    const slips = await SalarySlip.find(query).sort({ salaryYear: -1, salaryMonth: -1, createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: slips });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const actor = getPayrollActor(request);
    requirePayrollManager(actor);
    const slip = await saveSalarySlip(await request.json(), actor.id);
    return NextResponse.json({ success: true, data: slip }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}