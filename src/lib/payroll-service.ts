import { Employee } from "@/models/Employee";
import { SalarySlip } from "@/models/SalarySlip";
import { calculatePayroll, type PayrollInput, type PayrollResult } from "@/lib/payroll";
import { getPayrollSettings } from "@/lib/payroll-settings";

type PayrollPayload = Partial<PayrollInput> & {
  employeeId: string;
  salaryMonth: number;
  salaryYear: number;
};

function requiredPeriod(value: unknown, label: string, min: number, max: number) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${label} is invalid`);
  return number;
}

export async function buildSalarySlipPayload(payload: PayrollPayload, generatedBy: string, updatedBy?: string) {
  const employeeId = String(payload.employeeId || "").trim();
  if (!employeeId) throw new Error("Employee is required");
  const salaryMonth = requiredPeriod(payload.salaryMonth, "Salary month", 1, 12);
  const salaryYear = requiredPeriod(payload.salaryYear, "Salary year", 2000, 2200);
  const employee = await Employee.findOne({ id: employeeId }).lean();
  if (!employee) throw new Error("Employee not found");
  const settings = await getPayrollSettings();
  const annualCTC = Number(payload.annualCTC ?? 0);
  if (!Number.isFinite(annualCTC) || annualCTC <= 0) throw new Error("Annual CTC must be greater than zero");
  const basicSalary = Math.round((annualCTC / 12 * Number(settings.payroll_basic_percentage || 50) / 100 + Number.EPSILON) * 100) / 100;

  const result: PayrollResult = calculatePayroll({
    annualCTC,
    basicSalary,
    hra: Number(payload.hra ?? 0),
    hraMode: payload.hraMode,
    hraPercentage: payload.hraPercentage,
    conveyance: Number(payload.conveyance ?? 0),
    medicalAllowance: Number(payload.medicalAllowance ?? 0),
    specialAllowance: Number(payload.specialAllowance ?? 0),
    earnings: Array.isArray(payload.earnings) ? payload.earnings : [],
    deductions: Array.isArray(payload.deductions) ? payload.deductions : [],
    pfEnabled: payload.pfEnabled ?? settings.payroll_pf_enabled === "true",
    pfEmployeePercentage: payload.pfEmployeePercentage ?? Number(settings.payroll_pf_employee_percentage),
    pfEmployerPercentage: payload.pfEmployerPercentage ?? Number(settings.payroll_pf_employer_percentage),
    pfWageCeiling: payload.pfWageCeiling ?? Number(settings.payroll_pf_wage_ceiling),
    esiEnabled: payload.esiEnabled ?? settings.payroll_esi_enabled === "true",
    esiEmployeePercentage: payload.esiEmployeePercentage ?? Number(settings.payroll_esi_employee_percentage),
    esiEmployerPercentage: payload.esiEmployerPercentage ?? Number(settings.payroll_esi_employer_percentage),
    professionalTaxEnabled: payload.professionalTaxEnabled ?? settings.payroll_professional_tax_enabled === "true",
    professionalTax: payload.professionalTax ?? Number(settings.payroll_professional_tax),
    tdsEnabled: payload.tdsEnabled ?? settings.payroll_tds_enabled === "true",
    monthlyTds: payload.monthlyTds,
    annualTds: payload.annualTds,
    workingDays: payload.workingDays,
    paidDays: payload.paidDays,
    lwpDays: payload.lwpDays,
  });

  return {
    id: `SAL${Date.now()}${Math.floor(Math.random() * 1000)}`,
    employeeId, salaryMonth, salaryYear,
    annualCTC: result.annualCTC, monthlyCTC: result.monthlyCTC, annualGross: result.annualGross,
    basicSalary: result.basicSalary, hra: result.hra, conveyance: result.conveyance,
    medicalAllowance: result.medicalAllowance, specialAllowance: result.specialAllowance,
    grossSalary: result.grossSalary, earnings: result.earnings, deductions: result.deductions,
    pfEnabled: Boolean(result.pfEnabled), pfEmployeeContribution: result.pfEmployeeContribution,
    pfEmployerContribution: result.pfEmployerContribution, esiEnabled: Boolean(result.esiEnabled),
    esiEmployeeContribution: result.esiEmployeeContribution, esiEmployerContribution: result.esiEmployerContribution,
    professionalTax: result.professionalTax, tds: result.tds, lwpDays: result.lwpDays,
    lwpDeduction: result.lwpDeduction, totalEarnings: result.totalEarnings,
    totalDeductions: result.totalDeductions, netSalary: result.netSalary,
    amountInWords: result.amountInWords, workingDays: result.workingDays, paidDays: result.paidDays,
    employeeSnapshot: {
      name: employee.name, id: employee.id, email: employee.email, department: employee.department,
      designation: employee.designation, joiningDate: employee.joiningDate, mobile: employee.mobile,
      pan: (employee as any).pan || "", uan: (employee as any).uan || "",
      pfAccountNumber: (employee as any).pfAccountNumber || "", bankAccount: (employee as any).bankAccount || "",
      bankName: (employee as any).bankName || "",
    },
    companySnapshot: {
      name: settings.company_name || "",
      address: settings.company_address || "",
      email: settings.company_email || "",
      phone: settings.company_phone || "",
      website: settings.payroll_company_website || "",
      authorizedPerson: settings.payroll_authorized_person || "",
      authorizedDesignation: settings.payroll_authorized_designation || "",
    },
    generatedBy, ...(updatedBy ? { updatedBy } : {}),
  };
}

export async function saveSalarySlip(payload: PayrollPayload, actorId: string) {
  return SalarySlip.create(await buildSalarySlipPayload(payload, actorId, actorId));
}