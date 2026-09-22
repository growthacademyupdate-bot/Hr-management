export type AttendancePayrollRecord = {
  date: string;
  status?: string;
};

export type LeavePayrollRecord = {
  startDate: string;
  endDate: string;
  type?: string;
  isPaid?: boolean;
  paid?: boolean;
  status?: string;
};

export type AttendancePayrollSummary = {
  totalDaysInMonth: number;
  activeDays: number;
  presentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  absentDays: number;
  unpaidDays: number;
  payableDays: number;
};

export type AttendanceSalaryBreakdown = AttendancePayrollSummary & {
  monthlyInHandSalary: number;
  perDaySalary: number;
  unpaidDeduction: number;
  finalInHandSalary: number;
};

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

export function getTotalDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isUnpaidLeave(leave: LeavePayrollRecord) {
  const type = String(leave.type || "").toLowerCase();
  return leave.isPaid === false || leave.paid === false || /unpaid|without pay|lwp/.test(type);
}

function isApprovedLeave(leave: LeavePayrollRecord) {
  return !leave.status || ["hr_approved", "admin_approved"].includes(leave.status);
}

export function calculateAttendanceSalaryBreakdown(monthlyInHandSalary: number, summary: AttendancePayrollSummary): AttendanceSalaryBreakdown {
  const totalDaysInMonth = Math.max(1, Number(summary.totalDaysInMonth || 0));
  const monthlySalary = Math.max(0, Number(monthlyInHandSalary || 0));
  const perDaySalary = totalDaysInMonth > 0 ? roundMoney(monthlySalary / totalDaysInMonth) : 0;
  const finalInHandSalary = Math.max(0, roundMoney(perDaySalary * (summary.payableDays ?? 0)));
  const unpaidDeduction = Math.max(0, roundMoney(monthlySalary - finalInHandSalary));
  return {
    ...summary,
    monthlyInHandSalary: roundMoney(monthlySalary),
    perDaySalary,
    unpaidDeduction,
    finalInHandSalary,
  };
}

export function calculateAttendancePayroll(
  year: number,
  month: number,
  attendance: AttendancePayrollRecord[],
  leaves: LeavePayrollRecord[],
  joiningDate?: string,
  leavingDate?: string,
): AttendancePayrollSummary {
  const totalDaysInMonth = getTotalDaysInMonth(year, month);
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(totalDaysInMonth).padStart(2, "0")}`;
  const activeStart = joiningDate && joiningDate > monthStart ? joiningDate.slice(0, 10) : monthStart;
  const activeEnd = leavingDate && leavingDate.slice(0, 10) < monthEnd ? leavingDate.slice(0, 10) : monthEnd;
  const activeDays = activeStart <= activeEnd
    ? Math.floor((Date.UTC(Number(activeEnd.slice(0, 4)), Number(activeEnd.slice(5, 7)) - 1, Number(activeEnd.slice(8, 10))) - Date.UTC(Number(activeStart.slice(0, 4)), Number(activeStart.slice(5, 7)) - 1, Number(activeStart.slice(8, 10)))) / 86400000) + 1
    : 0;

  const attendanceByDate = new Map<string, string>();
  for (const record of attendance) {
    const date = String(record.date || "").slice(0, 10);
    if (date >= activeStart && date <= activeEnd && !attendanceByDate.has(date)) attendanceByDate.set(date, String(record.status || "Absent"));
  }

  const leaveByDate = new Map<string, boolean>();
  for (const leave of leaves) {
    if (!isApprovedLeave(leave)) continue;
    const start = String(leave.startDate || "").slice(0, 10) < activeStart ? activeStart : String(leave.startDate || "").slice(0, 10);
    const end = String(leave.endDate || "").slice(0, 10) > activeEnd ? activeEnd : String(leave.endDate || "").slice(0, 10);
    if (!start || !end || start > end) continue;
    const cursor = new Date(`${start}T00:00:00.000Z`);
    const last = new Date(`${end}T00:00:00.000Z`);
    const unpaid = isUnpaidLeave(leave);
    while (cursor <= last) {
      const date = toDateKey(cursor);
      leaveByDate.set(date, Boolean(leaveByDate.get(date) || unpaid));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  let presentDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let absentDays = 0;
  const cursor = new Date(`${activeStart}T00:00:00.000Z`);
  const last = new Date(`${activeEnd}T00:00:00.000Z`);
  while (cursor <= last) {
    const date = toDateKey(cursor);
    const leave = leaveByDate.get(date);
    if (leave === true) unpaidLeaveDays++;
    else if (leave === false) paidLeaveDays++;
    else if (["Present", "Short Day", "Holiday"].includes(attendanceByDate.get(date) || "")) presentDays++;
    else absentDays++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const unpaidDays = absentDays + unpaidLeaveDays;
  return { totalDaysInMonth, activeDays, presentDays, paidLeaveDays, unpaidLeaveDays, absentDays, unpaidDays, payableDays: Math.max(0, activeDays - unpaidDays) };
}