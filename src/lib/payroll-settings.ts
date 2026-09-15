import { Setting } from "@/models/Setting";

export const defaultPayrollSettings = {
  payroll_pf_enabled: "false",
  payroll_pf_employee_percentage: "12",
  payroll_pf_employer_percentage: "12",
  payroll_pf_wage_ceiling: "0",
  payroll_esi_enabled: "false",
  payroll_esi_employee_percentage: "0.75",
  payroll_esi_employer_percentage: "3.25",
  payroll_hra_percentage: "40",
  payroll_basic_percentage: "50",
  payroll_professional_tax_enabled: "true",
  payroll_professional_tax: "200",
  payroll_tds_enabled: "false",
  company_name: "AlMawa International",
  company_address: "",
  company_email: "",
  company_phone: "",
  payroll_company_website: "",
  payroll_authorized_person: "HR / Authorized Person",
  payroll_authorized_designation: "Authorized Signatory",
};

export async function getPayrollSettings() {
  const rows = await Setting.find({ key: { $in: Object.keys(defaultPayrollSettings) } }).lean();
  return rows.reduce((settings, row) => ({ ...settings, [row.key]: row.value }), { ...defaultPayrollSettings });
}
