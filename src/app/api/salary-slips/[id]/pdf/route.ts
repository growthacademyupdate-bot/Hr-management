import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import connectDB from "@/lib/mongoose";
import { SalarySlip } from "@/models/SalarySlip";
import { getPayrollActor } from "@/lib/payroll-auth";
import { Setting } from "@/models/Setting";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const actor = getPayrollActor(request);
    const { id } = await params;
    const slip = await SalarySlip.findOne({ id }).lean();
    if (!slip) return NextResponse.json({ success: false, error: "Salary slip not found" }, { status: 404 });
    if (actor.role === "employee" && slip.employeeId !== actor.id.replace(/^u_/, "")) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    const settings = await Setting.find({ key: { $in: ["payroll_company_name", "payroll_company_address", "payroll_company_email", "payroll_company_phone", "payroll_authorized_person", "payroll_authorized_designation"] } }).lean();
    const company = Object.fromEntries(settings.map((setting) => [setting.key, setting.value])) as Record<string, string>;
    const snapshot = (slip.companySnapshot || {}) as Record<string, string>;
    company.payroll_authorized_person = snapshot.authorizedPerson || company.payroll_authorized_person;
    company.payroll_authorized_designation = snapshot.authorizedDesignation || company.payroll_authorized_designation;
    const employee = slip.employeeSnapshot as any;
    const month = new Date(slip.salaryYear, slip.salaryMonth - 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
    const document = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    document.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    const completed = new Promise<Buffer>((resolve) => document.on("end", () => resolve(Buffer.concat(chunks))));
    const money = (value: number) => `Rs. ${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
    const row = (name: string, amount: number, x: number, y: number, width: number) => { document.fontSize(10).fillColor("#1f2937").text(name, x, y, { width }); document.text(money(amount), x + width - 100, y, { width: 100, align: "right" }); };
    document.fillColor("#1e3a5f").fontSize(20).font("Helvetica-Bold").text(snapshot.name || company.company_name || "Company");
    document.font("Helvetica").fontSize(9).fillColor("#64748b").text(snapshot.address || company.company_address || "Human Resources Department").text([snapshot.email || company.company_email, snapshot.phone || company.company_phone, snapshot.website || company.payroll_company_website].filter(Boolean).join(" | "));
    document.moveDown(1).fillColor("#1e3a5f").fontSize(16).font("Helvetica-Bold").text("SALARY SLIP", { align: "center" }); document.font("Helvetica").fontSize(10).fillColor("#64748b").text(month, { align: "center" });
    document.moveDown(1.5).strokeColor("#dbe4ee").moveTo(48, document.y).lineTo(547, document.y).stroke(); document.moveDown(1).font("Helvetica-Bold").fillColor("#1e3a5f").fontSize(11).text("Employee details"); document.moveDown(.6).font("Helvetica").fillColor("#111827").fontSize(10).text(`Employee: ${employee.name}    Employee ID: ${employee.id}`).text(`Designation: ${employee.designation}    Department: ${employee.department}`).text(`Joining date: ${employee.joiningDate}    Email: ${employee.email}`); document.moveDown(1).text(`Total days: ${slip.totalDaysInMonth}    Present: ${slip.presentDays}    Paid leave: ${slip.paidLeaveDays}`).text(`Unpaid leave: ${slip.unpaidLeaveDays}    Absent: ${slip.absentDays}    Unpaid days: ${slip.unpaidDays}`).text(`Payable days: ${slip.payableDays}    Per-day salary: ${money(slip.perDaySalary)}    Unpaid deduction: ${money(slip.unpaidDeduction)}`); document.moveDown(1);
    const tableTop = document.y; document.font("Helvetica-Bold").fillColor("#1e3a5f").text("EARNINGS", 48, tableTop); document.text("DEDUCTIONS", 310, tableTop); document.moveDown(1);
    const maxRows = Math.max(slip.earnings.length, slip.deductions.length); for (let index = 0; index < maxRows; index++) { const y = document.y; if (slip.earnings[index]) row(slip.earnings[index].name, slip.earnings[index].amount, 48, y, 220); if (slip.deductions[index]) row(slip.deductions[index].name, slip.deductions[index].amount, 310, y, 220); document.y = y + 20; }
    document.moveDown(.5).strokeColor("#dbe4ee").moveTo(48, document.y).lineTo(547, document.y).stroke(); document.moveDown(.8); row("Gross earnings", slip.grossSalary, 48, document.y, 220); row("Total deductions", slip.totalDeductions, 310, document.y, 220); document.moveDown(2); document.roundedRect(48, document.y, 499, 66, 6).fillAndStroke("#eff6ff", "#bfdbfe"); document.fillColor("#1e3a5f").font("Helvetica-Bold").fontSize(11).text("NET SALARY", 64, document.y + 16); document.fontSize(18).text(money(slip.netSalary), 64, document.y + 32); document.font("Helvetica").fontSize(9).fillColor("#475569").text(slip.amountInWords, 300, document.y + 32, { width: 230, align: "right" }); document.moveDown(5).fontSize(9).text(`Employer PF contribution: ${money(slip.pfEmployerContribution)}    Employer ESI contribution: ${money(slip.esiEmployerContribution)}`); document.moveDown(3).fillColor("#111827").text(company.payroll_authorized_person || "HR / Authorized Person").text(company.payroll_authorized_designation || "Authorized Signatory");
    document.end(); const pdf = await completed; const filename = `SalarySlip_${slip.employeeId}_${month.replace(/ /g, "_").toUpperCase()}.pdf`;
    return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"` } });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "PDF generation failed" }, { status: 400 }); }
}