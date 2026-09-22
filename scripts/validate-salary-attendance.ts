import assert from "node:assert/strict";
import { calculateAttendancePayroll, calculateAttendanceSalaryBreakdown } from "../src/lib/attendance-payroll";

function checkCase(label: string, year: number, month: number, attendance: { date: string; status: string }[], leaves: { startDate: string; endDate: string; type: string; isPaid: boolean; status: string }[], monthlySalary: number) {
  const summary = calculateAttendancePayroll(year, month, attendance, leaves, "2025-01-01", "2026-12-31");
  const breakdown = calculateAttendanceSalaryBreakdown(monthlySalary, summary);
  const totalDays = new Date(year, month, 0).getDate();
  assert.equal(summary.totalDaysInMonth, totalDays, `${label}: totalDaysInMonth should match calendar month`);
  assert.equal(summary.presentDays + summary.paidLeaveDays + summary.unpaidLeaveDays + summary.absentDays, totalDays, `${label}: day totals must not double-count`);
  assert.equal(summary.unpaidDays, summary.absentDays + summary.unpaidLeaveDays, `${label}: unpaidDays formula`);
  assert.equal(breakdown.payableDays, Math.max(0, summary.activeDays - summary.unpaidDays), `${label}: payableDays formula`);
  assert.ok(breakdown.perDaySalary > 0, `${label}: perDaySalary should be positive`);
  assert.ok(breakdown.finalInHandSalary >= 0, `${label}: final salary cannot be negative`);
  return { summary, breakdown };
}

const january = checkCase(
  "January 2026",
  2026,
  1,
  [
    { date: "2026-01-01", status: "Present" },
    { date: "2026-01-02", status: "Present" },
    { date: "2026-01-03", status: "Present" },
    { date: "2026-01-04", status: "Present" },
    { date: "2026-01-05", status: "Present" },
    { date: "2026-01-06", status: "Present" },
    { date: "2026-01-07", status: "Present" },
    { date: "2026-01-08", status: "Present" },
    { date: "2026-01-09", status: "Present" },
    { date: "2026-01-10", status: "Absent" },
    { date: "2026-01-11", status: "Present" },
    { date: "2026-01-12", status: "Present" },
    { date: "2026-01-13", status: "Present" },
    { date: "2026-01-14", status: "Present" },
    { date: "2026-01-15", status: "Present" },
    { date: "2026-01-16", status: "Present" },
    { date: "2026-01-17", status: "Present" },
    { date: "2026-01-18", status: "Present" },
    { date: "2026-01-19", status: "Present" },
    { date: "2026-01-20", status: "Present" },
    { date: "2026-01-21", status: "Present" },
    { date: "2026-01-22", status: "Present" },
    { date: "2026-01-23", status: "Present" },
    { date: "2026-01-24", status: "Present" },
    { date: "2026-01-25", status: "Present" },
    { date: "2026-01-26", status: "Present" },
    { date: "2026-01-27", status: "Present" },
    { date: "2026-01-28", status: "Present" },
    { date: "2026-01-29", status: "Present" },
    { date: "2026-01-30", status: "Present" },
    { date: "2026-01-31", status: "Present" },
  ],
  [
    { startDate: "2026-01-15", endDate: "2026-01-15", type: "Casual Leave", isPaid: true, status: "hr_approved" },
    { startDate: "2026-01-20", endDate: "2026-01-20", type: "Unpaid Leave", isPaid: false, status: "hr_approved" },
    { startDate: "2026-01-27", endDate: "2026-01-27", type: "Sick Leave", isPaid: true, status: "hr_approved" },
  ],
  50000,
);
assert.equal(january.summary.presentDays, 28, "January present days should be 28 for this sample");
assert.equal(january.summary.paidLeaveDays, 2, "January paid leave days should be 2");
assert.equal(january.summary.unpaidLeaveDays, 1, "January unpaid leave days should be 1");
assert.equal(january.summary.absentDays, 1, "January absent days should be 1");
assert.equal(january.summary.unpaidDays, 2, "January unpaidDays should be absent + unpaid leave");
assert.equal(january.summary.payableDays, 29, "January payableDays should be 31 - 2");
assert.equal(january.breakdown.perDaySalary, 1612.9, "January per day salary should be 50000 / 31");
assert.equal(january.breakdown.finalInHandSalary, 46667.1, "January final salary should match payroll formula");

const feb2026 = checkCase(
  "February 2026",
  2026,
  2,
  [
    { date: "2026-02-01", status: "Present" },
    { date: "2026-02-02", status: "Present" },
    { date: "2026-02-03", status: "Present" },
    { date: "2026-02-04", status: "Present" },
    { date: "2026-02-05", status: "Present" },
    { date: "2026-02-06", status: "Present" },
    { date: "2026-02-07", status: "Present" },
    { date: "2026-02-08", status: "Present" },
    { date: "2026-02-09", status: "Present" },
    { date: "2026-02-10", status: "Present" },
    { date: "2026-02-11", status: "Present" },
    { date: "2026-02-12", status: "Present" },
    { date: "2026-02-13", status: "Present" },
    { date: "2026-02-14", status: "Absent" },
    { date: "2026-02-15", status: "Present" },
    { date: "2026-02-16", status: "Present" },
    { date: "2026-02-17", status: "Present" },
    { date: "2026-02-18", status: "Present" },
    { date: "2026-02-19", status: "Present" },
    { date: "2026-02-20", status: "Present" },
    { date: "2026-02-21", status: "Present" },
    { date: "2026-02-22", status: "Present" },
    { date: "2026-02-23", status: "Present" },
    { date: "2026-02-24", status: "Present" },
    { date: "2026-02-25", status: "Present" },
    { date: "2026-02-26", status: "Present" },
    { date: "2026-02-27", status: "Present" },
    { date: "2026-02-28", status: "Present" },
  ],
  [
    { startDate: "2026-02-12", endDate: "2026-02-12", type: "Casual Leave", isPaid: true, status: "hr_approved" },
    { startDate: "2026-02-14", endDate: "2026-02-14", type: "Unpaid Leave", isPaid: false, status: "hr_approved" },
  ],
  50000,
);
assert.equal(feb2026.summary.totalDaysInMonth, 28, "February 2026 should have 28 days");
assert.equal(feb2026.summary.payableDays, 26, "February 2026 payable days should be 28 - (1 absent + 1 unpaid)");
assert.equal(feb2026.breakdown.perDaySalary, 1785.71, "February 2026 per day salary should use 28-day month");

const febLeap = checkCase(
  "February leap year",
  2024,
  2,
  [
    { date: "2024-02-01", status: "Present" },
    { date: "2024-02-02", status: "Present" },
    { date: "2024-02-03", status: "Present" },
    { date: "2024-02-04", status: "Present" },
    { date: "2024-02-05", status: "Present" },
    { date: "2024-02-06", status: "Present" },
    { date: "2024-02-07", status: "Present" },
    { date: "2024-02-08", status: "Present" },
    { date: "2024-02-09", status: "Present" },
    { date: "2024-02-10", status: "Present" },
    { date: "2024-02-11", status: "Present" },
    { date: "2024-02-12", status: "Present" },
    { date: "2024-02-13", status: "Present" },
    { date: "2024-02-14", status: "Present" },
    { date: "2024-02-15", status: "Present" },
    { date: "2024-02-16", status: "Present" },
    { date: "2024-02-17", status: "Present" },
    { date: "2024-02-18", status: "Present" },
    { date: "2024-02-19", status: "Present" },
    { date: "2024-02-20", status: "Present" },
    { date: "2024-02-21", status: "Present" },
    { date: "2024-02-22", status: "Present" },
    { date: "2024-02-23", status: "Present" },
    { date: "2024-02-24", status: "Present" },
    { date: "2024-02-25", status: "Present" },
    { date: "2024-02-26", status: "Present" },
    { date: "2024-02-27", status: "Present" },
    { date: "2024-02-28", status: "Present" },
    { date: "2024-02-29", status: "Present" },
  ],
  [
    { startDate: "2024-02-14", endDate: "2024-02-14", type: "Casual Leave", isPaid: true, status: "hr_approved" },
    { startDate: "2024-02-28", endDate: "2024-02-28", type: "Unpaid Leave", isPaid: false, status: "hr_approved" },
  ],
  50000,
);
assert.equal(febLeap.summary.totalDaysInMonth, 29, "Leap-year February should have 29 days");
assert.equal(febLeap.summary.payableDays, 27, "Leap-year February payable days should be 29 - (1 absent + 1 unpaid)");
assert.equal(febLeap.breakdown.perDaySalary, 1724.14, "Leap-year February per-day salary should use 29-day month");

const april = checkCase(
  "April 2026",
  2026,
  4,
  [
    { date: "2026-04-01", status: "Present" },
    { date: "2026-04-02", status: "Present" },
    { date: "2026-04-03", status: "Present" },
    { date: "2026-04-04", status: "Present" },
    { date: "2026-04-05", status: "Present" },
    { date: "2026-04-06", status: "Present" },
    { date: "2026-04-07", status: "Present" },
    { date: "2026-04-08", status: "Present" },
    { date: "2026-04-09", status: "Present" },
    { date: "2026-04-10", status: "Absent" },
    { date: "2026-04-11", status: "Present" },
    { date: "2026-04-12", status: "Present" },
    { date: "2026-04-13", status: "Present" },
    { date: "2026-04-14", status: "Present" },
    { date: "2026-04-15", status: "Present" },
    { date: "2026-04-16", status: "Present" },
    { date: "2026-04-17", status: "Present" },
    { date: "2026-04-18", status: "Present" },
    { date: "2026-04-19", status: "Present" },
    { date: "2026-04-20", status: "Present" },
    { date: "2026-04-21", status: "Present" },
    { date: "2026-04-22", status: "Present" },
    { date: "2026-04-23", status: "Present" },
    { date: "2026-04-24", status: "Present" },
    { date: "2026-04-25", status: "Present" },
    { date: "2026-04-26", status: "Present" },
    { date: "2026-04-27", status: "Present" },
    { date: "2026-04-28", status: "Present" },
    { date: "2026-04-29", status: "Present" },
    { date: "2026-04-30", status: "Present" },
  ],
  [
    { startDate: "2026-04-15", endDate: "2026-04-15", type: "Casual Leave", isPaid: true, status: "hr_approved" },
    { startDate: "2026-04-20", endDate: "2026-04-20", type: "Unpaid Leave", isPaid: false, status: "hr_approved" },
  ],
  50000,
);
assert.equal(april.summary.totalDaysInMonth, 30, "April should have 30 days");
assert.equal(april.summary.unpaidDays, 2, "April unpaid days should be absent + unpaid leave");
assert.equal(april.summary.payableDays, 28, "April payable days should be 30 - 2");
assert.equal(april.breakdown.perDaySalary, 1666.67, "April per-day salary should use 30-day month");

console.log("Attendance salary validation passed for 31-day, 28-day, 29-day, and 30-day month scenarios.");
