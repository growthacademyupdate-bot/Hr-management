export type PayrollItem = { name: string; amount: number; type: "earning" | "deduction" };

export type PayrollInput = {
  annualCTC: number;
  basicSalary: number;
  hra?: number;
  hraMode?: "amount" | "percentage";
  hraPercentage?: number;
  conveyance?: number;
  medicalAllowance?: number;
  specialAllowance?: number;
  earnings?: Array<{ name: string; amount: number }>;
  deductions?: Array<{ name: string; amount: number }>;
  pfEnabled?: boolean;
  pfEmployeePercentage?: number;
  pfEmployerPercentage?: number;
  pfWageCeiling?: number;
  esiEnabled?: boolean;
  esiEmployeePercentage?: number;
  esiEmployerPercentage?: number;
  professionalTaxEnabled?: boolean;
  professionalTax?: number;
  tdsEnabled?: boolean;
  monthlyTds?: number;
  annualTds?: number;
  workingDays?: number;
  paidDays?: number;
  lwpDays?: number;
};

export type PayrollResult = PayrollInput & {
  monthlyCTC: number;
  annualGross: number;
  hra: number;
  grossSalary: number;
  earnings: PayrollItem[];
  deductions: PayrollItem[];
  pfEmployeeContribution: number;
  pfEmployerContribution: number;
  esiEmployeeContribution: number;
  esiEmployerContribution: number;
  professionalTax: number;
  tds: number;
  lwpDeduction: number;
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
  amountInWords: string;
};

export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function assertMoney(value: unknown, label: string) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric < 0) throw new Error(`${label} must be a non-negative number`);
  return roundMoney(numeric);
}

const ones = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function underThousand(value: number): string {
  if (value < 20) return ones[value];
  if (value < 100) return `${tens[Math.floor(value / 10)]}${value % 10 ? `-${ones[value % 10]}` : ""}`;
  return `${ones[Math.floor(value / 100)]} Hundred${value % 100 ? ` ${underThousand(value % 100)}` : ""}`;
}
function indianNumber(value: number): string {
  if (value < 1000) return underThousand(value);
  if (value < 100000) return `${underThousand(Math.floor(value / 1000))} Thousand${value % 1000 ? ` ${underThousand(value % 1000)}` : ""}`;
  if (value < 10000000) return `${indianNumber(Math.floor(value / 100000))} Lakh${value % 100000 ? ` ${indianNumber(value % 100000)}` : ""}`;
  return `${indianNumber(Math.floor(value / 10000000))} Crore${value % 10000000 ? ` ${indianNumber(value % 10000000)}` : ""}`;
}
export function amountInWords(value: number) {
  const rounded = Math.floor(roundMoney(value));
  if (rounded === 0) return "Zero Rupees Only";
  return `${indianNumber(rounded)} Rupees Only`;
}

export function calculatePayroll(input: PayrollInput): PayrollResult {
  const annualCTC = assertMoney(input.annualCTC, "Annual CTC");
  const basicSalary = assertMoney(input.basicSalary, "Basic salary");
  const monthlyCTC = roundMoney(annualCTC / 12);
  const hraBase = input.hraMode === "percentage" ? basicSalary * assertMoney(input.hraPercentage, "HRA percentage") / 100 : assertMoney(input.hra, "HRA");
  const hra = roundMoney(hraBase);
  const conveyance = assertMoney(input.conveyance, "Conveyance");
  const medicalAllowance = assertMoney(input.medicalAllowance, "Medical allowance");
  const customEarnings = (input.earnings || []).map(item => ({ name: String(item.name || "Other earnings").trim(), amount: assertMoney(item.amount, "Earning amount"), type: "earning" as const }));
  const customDeductions = (input.deductions || []).map(item => ({ name: String(item.name || "Other deduction").trim(), amount: assertMoney(item.amount, "Deduction amount"), type: "deduction" as const }));
  const customEarningsTotal = customEarnings.reduce((sum, item) => sum + item.amount, 0);
  const automaticSpecialAllowance = Math.max(0, monthlyCTC - basicSalary - hra - conveyance - medicalAllowance - customEarningsTotal);
  const specialAllowance = input.specialAllowance ? assertMoney(input.specialAllowance, "Special allowance") : roundMoney(automaticSpecialAllowance);
  const pfBase = input.pfWageCeiling && input.pfWageCeiling > 0 ? Math.min(basicSalary, input.pfWageCeiling) : basicSalary;
  const pfEmployeeContribution = input.pfEnabled ? roundMoney(pfBase * assertMoney(input.pfEmployeePercentage ?? 12, "PF employee percentage") / 100) : 0;
  const pfEmployerContribution = input.pfEnabled ? roundMoney(pfBase * assertMoney(input.pfEmployerPercentage ?? 12, "PF employer percentage") / 100) : 0;
  const esiBase = basicSalary + hra + conveyance + medicalAllowance + specialAllowance;
  const esiEmployeeContribution = input.esiEnabled ? roundMoney(esiBase * assertMoney(input.esiEmployeePercentage ?? 0.75, "ESI employee percentage") / 100) : 0;
  const esiEmployerContribution = input.esiEnabled ? roundMoney(esiBase * assertMoney(input.esiEmployerPercentage ?? 3.25, "ESI employer percentage") / 100) : 0;
  const workingDays = Math.max(1, Math.floor(Number(input.workingDays || 30)));
  const lwpDays = Math.max(0, Math.floor(Number(input.lwpDays || 0)));
  if (lwpDays > workingDays) throw new Error("LWP days cannot exceed working days");
  const grossSalary = roundMoney(basicSalary + hra + conveyance + medicalAllowance + specialAllowance + customEarnings.reduce((sum, item) => sum + item.amount, 0));
  const lwpDeduction = roundMoney(grossSalary / workingDays * lwpDays);
  const tds = input.tdsEnabled ? (input.annualTds ? roundMoney(assertMoney(input.annualTds, "Annual TDS") / 12) : assertMoney(input.monthlyTds, "Monthly TDS")) : 0;
  const professionalTax = input.professionalTaxEnabled ? assertMoney(input.professionalTax, "Professional tax") : 0;
  const deductions: PayrollItem[] = [
    ...(pfEmployeeContribution ? [{ name: "Provident Fund (PF)", amount: pfEmployeeContribution, type: "deduction" as const }] : []),
    ...(esiEmployeeContribution ? [{ name: "Employee State Insurance (ESI)", amount: esiEmployeeContribution, type: "deduction" as const }] : []),
    ...(professionalTax ? [{ name: "Professional Tax", amount: professionalTax, type: "deduction" as const }] : []),
    ...(tds ? [{ name: "Income Tax / TDS", amount: tds, type: "deduction" as const }] : []),
    ...(lwpDeduction ? [{ name: "Leave Without Pay (LWP)", amount: lwpDeduction, type: "deduction" as const }] : []),
    ...customDeductions,
  ];
  const earnings: PayrollItem[] = [
    { name: "Basic Salary", amount: basicSalary, type: "earning" },
    { name: "House Rent Allowance (HRA)", amount: hra, type: "earning" },
    { name: "Conveyance / Transport", amount: conveyance, type: "earning" },
    { name: "Medical Allowance", amount: medicalAllowance, type: "earning" },
    { name: "Special Allowance", amount: specialAllowance, type: "earning" },
    ...customEarnings,
  ];
  const totalEarnings = grossSalary;
  const totalDeductions = roundMoney(deductions.reduce((sum, item) => sum + item.amount, 0));
  const netSalary = roundMoney(Math.max(0, grossSalary - totalDeductions));
  return { ...input, annualCTC, basicSalary, hra, conveyance, medicalAllowance, specialAllowance, monthlyCTC, annualGross: roundMoney(grossSalary * 12), grossSalary, earnings, deductions, pfEmployeeContribution, pfEmployerContribution, esiEmployeeContribution, esiEmployerContribution, lwpDeduction, workingDays, paidDays: Math.max(0, workingDays - lwpDays), lwpDays, tds, professionalTax, totalEarnings, totalDeductions, netSalary, amountInWords: amountInWords(netSalary) };
}
