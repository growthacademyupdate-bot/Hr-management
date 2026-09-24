import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import { SalarySlip } from "@/models/SalarySlip";
import { getPayrollActor, requirePayrollManager } from "@/lib/payroll-auth";
import { buildSalarySlipPayload } from "@/lib/payroll-service";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Payroll request failed";
  return NextResponse.json({ success: false, error: message }, { status: /Unauthorized|Authentication|Only HR/.test(message) ? 403 : 400 });
}

export async function GET(request: NextRequest, { params }: any) {
  try {
    await connectDB();
    const actor = getPayrollActor(request);
    const { id } = await params;
    const slip = await SalarySlip.findOne({ id }).lean();
    if (!slip) return NextResponse.json({ success: false, error: "Salary slip not found" }, { status: 404 });
    if (actor.role === "employee" && slip.employeeId !== actor.id.replace(/^u_/, "")) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    return NextResponse.json({ success: true, data: slip });
  } catch (error) { return errorResponse(error); }
}

export async function PUT(request: NextRequest, { params }: any) {
  try {
    await connectDB();
    const actor = getPayrollActor(request);
    requirePayrollManager(actor);
    const { id } = await params;
    const existing = await SalarySlip.findOne({ id }).lean();
    if (!existing) return NextResponse.json({ success: false, error: "Salary slip not found" }, { status: 404 });
    const body = await request.json();
    const values = await buildSalarySlipPayload({ ...body, employeeId: existing.employeeId, salaryMonth: existing.salaryMonth, salaryYear: existing.salaryYear }, actor.id, actor.id);
    const updated = await SalarySlip.findOneAndUpdate({ id }, { $set: { ...values, id, generatedBy: existing.generatedBy } }, { new: true, runValidators: true }).lean();
    return NextResponse.json({ success: true, data: updated });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: NextRequest, { params }: any) {
  try {
    await connectDB();
    const actor = getPayrollActor(request);
    requirePayrollManager(actor);
    const { id } = await params;
    const deleted = await SalarySlip.findOneAndDelete({ id });
    if (!deleted) return NextResponse.json({ success: false, error: "Salary slip not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) { return errorResponse(error); }
}