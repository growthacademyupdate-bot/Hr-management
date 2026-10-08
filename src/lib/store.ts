import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import {
  getEmployees, addEmployee, updateEmployee, deleteEmployee,
  getTasks, addTask, updateTask, deleteTask, addComment, updateTaskStatus, reviewTask,
  getLeaves, addLeave, cancelLeave, hrReviewLeave, adminReviewLeave, deleteLeave as deleteLeaveAction,
  getAttendance, getActivities, logLogoutActivity, deleteAttendance, deleteActivity as deleteActivityAction, updateSystemSetting, getSystemSettings, updateSystemSettings,
  getHolidays, createHoliday, updateHoliday, deleteHoliday,
  getExpenses, addExpense, updateExpense, cancelExpense, hrReviewExpense, adminReviewExpense, markExpenseReimbursed, deleteExpense,
  getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification as deleteNotificationAction, broadcastNotification, editBroadcastNotification, deleteBroadcastNotification,
  getDailyReports, addDailyReport, deleteDailyReport,
  getLeads, addLead, updateLead, deleteLead,
  getDataScrapings, addDataScraping, deleteDataScraping,
  getInvoices, createInvoice, deleteInvoice
} from "@/app/actions";

export type Role = "admin" | "hr" | "employee";
export interface User {
  id: string; username: string; password?: string; role: Role; jobRole?: string; name: string; email: string; avatar?: string; employeeId?: string; loginDate?: string;
}
export interface Employee {
  id: string; name: string; email: string; mobile: string; department: string; designation: string; jobRole?: string; joiningDate: string; salary: number; status: string; avatar?: string; password?: string; emergencyContact?: string; documents?: any; gstin?: string; address?: string; state?: string;
}
export interface AttendanceSession {
  loginAt: string;
  logoutAt: string | null;
  durationSeconds: number;
}
export interface AttendanceRecord {
  id: string; employeeId: string; date: string; loginTime: string | null; logoutTime: string | null; workingHours: number; status: string; productivity: number; firstLoginAt?: string; lastLogoutAt?: string; totalWorkingSeconds?: number; totalWorkingHours?: number; sessions?: AttendanceSession[];
}
export interface Task {
  id: string; title: string; description: string; assignedTo: string; assignedBy: string; priority: "low" | "medium" | "high" | "urgent"; status: "assigned" | "working_progress" | "completed" | "reviewed"; assignDate: string; dueDate: string; startedAt: string | null; completedAt: string | null; reviewedAt: string | null; hrRating: string | null; hrReview: string | null; reviewedBy: string | null; createdAt: string; updatedAt: string;
}
export interface Leave {
  id: string; employeeId: string; type: "Casual Leave" | "Sick Leave" | "Earned Leave" | "Emergency Leave" | "Other"; startDate: string; endDate: string; numberOfDays: number; reason: string; status: "pending" | "hr_approved" | "hr_rejected" | "admin_approved" | "admin_rejected" | "cancelled"; appliedAt: string; hrReviewedBy?: string | null; hrReviewedAt?: string | null; hrReviewComment?: string | null; adminReviewedBy?: string | null; adminReviewedAt?: string | null; adminReviewComment?: string | null; cancelledBy?: string | null; cancelledAt?: string | null;
}
export interface Expense {
  id: string; employeeId: string; title: string; category: string; amount: number; expenseDate: string; description: string; receiptUrls?: string[] | null; gstPercent?: number; vehicleType?: string; vehicleNumber?: string; distanceKm?: number; vehicleAverage?: number; petrolRate?: number; trips?: { date: string; distanceKm: number; vehicleAverage: number; petrolRate: number; amount: number; }[]; bankHolderName?: string; bankName?: string; branch?: string; accountNo?: string; ifscCode?: string; upiId?: string; status: "pending" | "hr_approved" | "hr_rejected" | "admin_approved" | "admin_rejected" | "reimbursed" | "cancelled"; appliedAt: string; hrReviewedBy?: string | null; hrReviewedAt?: string | null; hrReviewComment?: string | null; adminReviewedBy?: string | null; adminReviewedAt?: string | null; adminReviewComment?: string | null; reimbursedBy?: string | null; reimbursedAt?: string | null; cancelledBy?: string | null; cancelledAt?: string | null;
}
export interface Activity {
  id: string; employeeId: string; time: string; label: string; type: string;
  actorId?: string; actorRole?: string; module?: string; referenceId?: string; metadata?: any;
}

export interface Holiday {
  id: string; name: string; description?: string; holidayType: "COMPANY_HOLIDAY" | "OPTIONAL_HOLIDAY" | "RESTRICTED_HOLIDAY" | "CUSTOM_HOLIDAY"; startDate: string; endDate: string; isActive: boolean; createdBy?: string; updatedBy?: string; createdAt: string; updatedAt: string;
}
export interface Notification {
  id: string; recipientId: string; recipientRole?: string; senderId?: string; senderRole?: string; title: string; message: string; type: string; module: string; referenceId?: string; actionUrl?: string; isRead: boolean; readAt?: string; metadata?: any; createdAt: string;
}

export interface Lead {
  id: string; customerName: string; company?: string; mobile: string; alternateMobile?: string; email?: string; address?: string; city?: string; state?: string; pincode?: string; leadSource?: string; productService?: string; leadStatus: string; followUpDate?: string; remarks?: string; notes?: string; requirement?: string; expectedValue?: number; employeeId: string; createdBy?: string; createdAt?: string; updatedAt?: string;
  callOutcome?: string; clientFollowUp?: string; constructionInteriorWork?: boolean; gmbProfileWork?: boolean; logoWork?: boolean; websiteWork?: boolean; documentationWork?: boolean;
}

export interface DailyReport {
  id: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  reportDate: string;
  reportDay: string;
  attendance: string;
  reportSlot1: string;
  reportSlot2: string;
  reportSlot3: string;
  reportSlot4: string;
  directorCallTiming: string;
  internalMeeting: string;
  jobRole?: string;
  newLeads?: number;
  followUps?: number;
  interestedCustomers?: number;
  positiveCustomers?: number;
  convertedCustomers?: number;
  callsMade?: number;
  meetings?: number;
  additionalNotes?: string;
  submittedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DataScrapingRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  businessName: string;
  state: string;
  totalDataCollected: number;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string; employeeId: string; invoiceDate: string; paymentMode: string; reverseCharge: string;
  buyerOrderNo?: string; supplierRef?: string; vehicleNumber?: string; deliveryDate?: string; transportDetails?: string; termsOfDelivery?: string;
  items: any[]; totalQuantity: number; subTotal: number; cgst: number; sgst: number; igst: number; roundOff: number; totalAmount: number;
  status: string; createdBy: string; createdAt: string;
}

interface DB {
  employees: Employee[]; attendance: AttendanceRecord[]; tasks: Task[]; leaves: Leave[]; expenses: Expense[]; activities: Activity[]; holidays: Holiday[]; notifications: Notification[]; dailyReports: DailyReport[]; leads: Lead[]; dataScrapings: DataScrapingRecord[]; invoices: Invoice[];
  isLoading: boolean;
}

const AUTH_KEY = "ems_auth_v1";
let currentDB: DB = { employees: [], attendance: [], tasks: [], leaves: [], expenses: [], activities: [], holidays: [], notifications: [], dailyReports: [], leads: [], dataScrapings: [], invoices: [], isLoading: true };
let globalSearch = "";
const listeners = new Set<() => void>();

function notify() { listeners.forEach((l) => l()); }

let isFetching = false;
let lastFetchTime = 0;
const MIN_FETCH_INTERVAL = 4000;
let pollInterval: NodeJS.Timeout | null = null;
let initialized = false;

export async function refreshDB(force = false) {
  const now = Date.now();
  if (isFetching) return;
  if (!force && now - lastFetchTime < MIN_FETCH_INTERVAL) return;

  isFetching = true;
  lastFetchTime = now;
  try {
    const user = getCurrentUser();
    const userId = user?.employeeId || user?.id;
    const [emps, atts, ts, lvs, exps, acts, hols, notifs, dReports, leadsData, dScrapings, invs] = await Promise.all([
      getEmployees(),
      getAttendance(),
      getTasks(user?.role, userId),
      getLeaves(user?.role, userId),
      getExpenses(user?.role, userId),
      getActivities(),
      getHolidays(),
      userId ? getNotifications(userId) : Promise.resolve([]),
      getDailyReports(user?.role, userId),
      getLeads(user?.role, userId),
      getDataScrapings(user?.role, userId),
      user?.role === "admin" ? getInvoices() : Promise.resolve([])
    ]);
    currentDB = {
      employees: emps || [],
      attendance: atts || [],
      tasks: ts || [],
      leaves: lvs || [],
      expenses: exps || [],
      activities: acts || [],
      holidays: hols || [],
      notifications: notifs || [],
      dailyReports: dReports || [],
      leads: leadsData || [],
      dataScrapings: dScrapings || [],
      invoices: invs || [],
      isLoading: false
    };

    // Auto-sync employee session with db
    if (user && user.role === "employee") {
      const dbEmp = (emps || []).find((e: any) => e.id === user.employeeId);
      if (dbEmp && dbEmp.jobRole !== user.jobRole) {
        const updatedUser = { ...user, jobRole: dbEmp.jobRole };
        localStorage.setItem(AUTH_KEY, JSON.stringify(updatedUser));
        window.dispatchEvent(new Event("ems_auth_change"));
      }
    }

    notify();
  } catch (err) {
    console.error("refreshDB error:", err);
    currentDB = { ...currentDB, isLoading: false };
    notify();
  } finally {
    isFetching = false;
  }
}

function startPollingIfNeeded() {
  if (typeof window === "undefined" || pollInterval) return;

  if (!initialized) {
    initialized = true;
    refreshDB(true);
  }

  pollInterval = setInterval(() => {
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      refreshDB(false);
    }
  }, 6000);

  window.addEventListener("focus", () => {
    refreshDB(false);
  });
}

function subscribeDB(cb: () => void) {
  listeners.add(cb);
  startPollingIfNeeded();
  return () => {
    listeners.delete(cb);
  };
}

function getDBSnapshot() {
  return currentDB;
}

export function useDB() {
  const snap = useSyncExternalStore(
    subscribeDB,
    getDBSnapshot,
    getDBSnapshot
  );

  return snap;
}

const searchListeners = new Set<() => void>();
function notifySearch() { searchListeners.forEach((l) => l()); }

function subscribeSearch(cb: () => void) {
  searchListeners.add(cb);
  return () => {
    searchListeners.delete(cb);
  };
}

function getSearchSnapshot() {
  return globalSearch;
}

export function useGlobalSearch() {
  const snap = useSyncExternalStore(
    subscribeSearch,
    getSearchSnapshot,
    getSearchSnapshot
  );
  return snap;
}

export const api = {
  resetDB() { /* No-op for real DB */ },
  refreshDB(force = true) { return refreshDB(force); },
  setGlobalSearch(q: string) { globalSearch = q; notifySearch(); },
  async addEmployee(emp: any) { const e = await addEmployee(emp); currentDB.employees = [e, ...currentDB.employees]; notify(); return e; },
  async updateEmployee(id: string, patch: any) { const e = await updateEmployee(id, patch); currentDB.employees = currentDB.employees.map(x => x.id === id ? e : x); notify(); },
  async deleteEmployee(id: string) {
    await deleteEmployee(id);
    currentDB.employees = currentDB.employees.filter(x => x.id !== id);
    currentDB.tasks = currentDB.tasks.filter(x => x.assignedTo !== id);
    currentDB.leaves = currentDB.leaves.filter(x => x.employeeId !== id);
    currentDB.attendance = currentDB.attendance.filter(x => x.employeeId !== id);
    currentDB.expenses = currentDB.expenses.filter(x => x.employeeId !== id);
    notify();
  },

  async addTask(task: any) { const user = getCurrentUser(); if (!user) return; const t = await addTask(task, user.role, user.employeeId || user.id); currentDB.tasks = [t, ...currentDB.tasks]; notify(); return t; },
  async updateTask(id: string, patch: any) { const user = getCurrentUser(); if (!user) return; const t = await updateTask(id, patch, user.employeeId || user.id, user.role); currentDB.tasks = currentDB.tasks.map(x => x.id === id ? t : x); notify(); },
  async deleteTask(id: string) { const user = getCurrentUser(); if (!user) return; await deleteTask(id, user.employeeId || user.id, user.role); currentDB.tasks = currentDB.tasks.filter(x => x.id !== id); notify(); },
  async updateTaskStatus(taskId: string, status: string) { const user = getCurrentUser(); if (!user) return; const t = await updateTaskStatus(taskId, status, user.employeeId || user.id, user.role); currentDB.tasks = currentDB.tasks.map(x => x.id === taskId ? t : x); notify(); },
  async reviewTask(taskId: string, review: { hrRating: string; hrReview: string }) { const user = getCurrentUser(); if (!user) return; const t = await reviewTask(taskId, review, user.employeeId || user.id, user.role); currentDB.tasks = currentDB.tasks.map(x => x.id === taskId ? t : x); notify(); },

  async addLeave(leave: any, userId?: string) { const user = getCurrentUser(); if (!user) return; const uid = userId || user.employeeId || user.id; const l = await addLeave(leave, uid); currentDB.leaves = [l, ...currentDB.leaves]; getNotifications(uid).then(n => { currentDB.notifications = n; notify(); }).catch(console.error); notify(); return l; },
  async cancelLeave(leaveId: string) { const user = getCurrentUser(); if (!user) return; const l = await cancelLeave(leaveId, user.employeeId || user.id); currentDB.leaves = currentDB.leaves.map(x => x.id === leaveId ? l : x); notify(); },
  async hrReviewLeave(leaveId: string, action: "approve" | "reject", comment: string) { const user = getCurrentUser(); if (!user) return; const l = await hrReviewLeave(leaveId, action, comment, user.employeeId || user.id, user.role); currentDB.leaves = currentDB.leaves.map(x => x.id === leaveId ? l : x); notify(); },
  async adminReviewLeave(leaveId: string, action: "approve" | "reject", comment: string) { const user = getCurrentUser(); if (!user) return; const l = await adminReviewLeave(leaveId, action, comment, user.employeeId || user.id, user.role); currentDB.leaves = currentDB.leaves.map(x => x.id === leaveId ? l : x); notify(); },
  async deleteLeave(leaveId: string) { const user = getCurrentUser(); if (!user) return; try { await deleteLeaveAction(leaveId, user.employeeId || user.id, user.role); currentDB.leaves = currentDB.leaves.filter(x => x.id !== leaveId); notify(); } catch (error: any) { console.error("Delete leave error:", error); throw error; } },

  async addExpense(expense: any) { const user = getCurrentUser(); if (!user) return; const e = await addExpense(expense, user.employeeId || user.id); currentDB.expenses = [e, ...currentDB.expenses]; getNotifications(user.employeeId || user.id).then(n => { currentDB.notifications = n; notify(); }).catch(console.error); notify(); return e; },
  async cancelExpense(expenseId: string) { const user = getCurrentUser(); if (!user) return; const e = await cancelExpense(expenseId, user.employeeId || user.id); currentDB.expenses = currentDB.expenses.map(x => x.id === expenseId ? e : x); notify(); },
  async hrReviewExpense(expenseId: string, action: "approve" | "reject", comment: string) { const user = getCurrentUser(); if (!user) return; const e = await hrReviewExpense(expenseId, action, comment, user.employeeId || user.id, user.role); currentDB.expenses = currentDB.expenses.map(x => x.id === expenseId ? e : x); notify(); },
  async adminReviewExpense(expenseId: string, action: "approve" | "reject", comment: string) { const user = getCurrentUser(); if (!user) return; const e = await adminReviewExpense(expenseId, action, comment, user.employeeId || user.id, user.role); currentDB.expenses = currentDB.expenses.map(x => x.id === expenseId ? e : x); notify(); },
  async markExpenseReimbursed(expenseId: string) { const user = getCurrentUser(); if (!user) return; const e = await markExpenseReimbursed(expenseId, user.employeeId || user.id, user.role); currentDB.expenses = currentDB.expenses.map(x => x.id === expenseId ? e : x); notify(); },
  async updateExpense(id: string, data: any) { const user = getCurrentUser(); if (!user) return; const e = await updateExpense(id, data, user.role, user.employeeId || user.id); currentDB.expenses = currentDB.expenses.map(x => x.id === id ? e : x); notify(); },
  async deleteExpense(id: string) { const user = getCurrentUser(); if (!user) return; await deleteExpense(id, user.role, user.employeeId || user.id); currentDB.expenses = currentDB.expenses.filter(x => x.id !== id); notify(); },

  async deleteAttendance(id: string) { const user = getCurrentUser(); if (!user) return; await deleteAttendance(id, user.role); currentDB.attendance = currentDB.attendance.filter(x => x.id !== id); notify(); },
  async deleteActivity(id: string) { const user = getCurrentUser(); if (!user) return; try { await deleteActivityAction(id, user.role); currentDB.activities = currentDB.activities.filter(x => x.id !== id); notify(); } catch (error: any) { console.error("Delete activity error:", error); throw error; } },
  async updateSystemSetting(key: string, value: string) { await updateSystemSetting(key, value); },
  async getSystemSettings() { return await getSystemSettings(); },
  async updateSystemSettings(settings: Record<string, string>) { return await updateSystemSettings(settings); },

  async createHoliday(data: any) { const user = getCurrentUser(); if (!user) return; const h = await createHoliday(data, user.employeeId || user.id, user.role); currentDB.holidays = [...currentDB.holidays, h].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()); notify(); return h; },
  async updateHoliday(id: string, patch: any) { const user = getCurrentUser(); if (!user) return; const h = await updateHoliday(id, patch, user.employeeId || user.id, user.role); currentDB.holidays = currentDB.holidays.map(x => x.id === id ? h : x); notify(); },
  async deleteHoliday(id: string) { const user = getCurrentUser(); if (!user) return; await deleteHoliday(id, user.employeeId || user.id, user.role); currentDB.holidays = currentDB.holidays.filter(x => x.id !== id); notify(); },

  async markNotificationAsRead(id: string) { const user = getCurrentUser(); if (!user) return; const n = await markNotificationAsRead(id, user.employeeId || user.id); currentDB.notifications = currentDB.notifications.map(x => x.id === id ? n : x); notify(); },
  async markAllNotificationsAsRead() { const user = getCurrentUser(); if (!user) return; await markAllNotificationsAsRead(user.employeeId || user.id); currentDB.notifications = currentDB.notifications.map(x => ({ ...x, isRead: true })); notify(); },
  async deleteNotification(notificationId: string) { const user = getCurrentUser(); if (!user) return; try { await deleteNotificationAction(notificationId, user.employeeId || user.id, user.role); currentDB.notifications = currentDB.notifications.filter(x => x.id !== notificationId); notify(); } catch (error: any) { console.error("Delete notification error:", error); throw error; } },
  async broadcastNotification(data: { title: string, message: string }) {
    const user = getCurrentUser();
    if (!user) return;
    await broadcastNotification({ ...data, senderId: user.employeeId || user.id, senderRole: user.role });
    toast.success("Broadcast sent successfully!");
  },
  async editBroadcastNotification(broadcastId: string, data: { title: string, message: string }) {
    await editBroadcastNotification(broadcastId, data);
    toast.success("Broadcast updated successfully!");
  },
  async deleteBroadcastNotification(broadcastId: string) {
    await deleteBroadcastNotification(broadcastId);
    toast.success("Broadcast deleted successfully!");
  },

  async addDailyReport(data: any) {
    const user = getCurrentUser();
    if (!user) return;
    const report = await addDailyReport(data, user.employeeId || user.id, user.role);
    currentDB.dailyReports = [report, ...currentDB.dailyReports];
    notify();
    return report;
  },
  async deleteDailyReport(reportId: string) {
    const user = getCurrentUser();
    if (!user) return;
    await deleteDailyReport(reportId, user.employeeId || user.id, user.role);
    currentDB.dailyReports = currentDB.dailyReports.filter(r => r.id !== reportId);
    notify();
  },

  // LEADS
  async addLead(data: any) {
    const user = getCurrentUser();
    if (!user) return;
    const empId = data.employeeId || user.employeeId || user.id;
    const lead = await addLead(data, empId);
    currentDB.leads = [lead, ...currentDB.leads];
    notify();
    return lead;
  },
  async updateLead(id: string, data: any) {
    const user = getCurrentUser();
    if (!user) return;
    const lead = await updateLead(id, data, user.role, user.employeeId || user.id);
    currentDB.leads = currentDB.leads.map(x => x.id === id ? lead : x);
    notify();
    return lead;
  },
  async deleteLead(id: string) {
    const user = getCurrentUser();
    if (!user) return;
    await deleteLead(id, user.role);
    currentDB.leads = currentDB.leads.filter(x => x.id !== id);
    notify();
  },

  async addDataScraping(data: any) {
    const user = getCurrentUser();
    if (!user) return;
    const empId = user.employeeId || user.id;
    const d = await addDataScraping({ ...data, employeeName: user.name }, empId);
    currentDB.dataScrapings = [d, ...currentDB.dataScrapings];
    notify();
    return d;
  },
  async deleteDataScraping(id: string) {
    const user = getCurrentUser();
    if (!user) return;
    await deleteDataScraping(id, user.role);
    currentDB.dataScrapings = currentDB.dataScrapings.filter(x => x.id !== id);
    notify();
  },

  async createInvoice(data: any) {
    const user = getCurrentUser();
    if (!user || user.role !== "admin") return;
    const inv = await createInvoice(data, user.employeeId || user.id, user.role);
    currentDB.invoices = [inv, ...currentDB.invoices];
    notify();
    return inv;
  },
  async deleteInvoice(id: string) {
    const user = getCurrentUser();
    if (!user || user.role !== "admin") return;
    await deleteInvoice(id, user.role);
    currentDB.invoices = currentDB.invoices.filter(x => x.id !== id);
    notify();
  }
};

// Auth
export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    const user = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    // Force employees to log in daily to track attendance
    if (user.role === "employee" && user.loginDate !== today) {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
    return user;
  } catch { return null; }
}

export function logout() {
  const user = getCurrentUser();
  if (user?.employeeId) {
    logLogoutActivity(user.employeeId).catch(console.error);
  }
  localStorage.removeItem(AUTH_KEY);
  window.dispatchEvent(new Event("ems_auth_change"));
}

export function useAuth() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    setUser(getCurrentUser());
    const handler = () => setUser(getCurrentUser());
    window.addEventListener("ems_auth_change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("ems_auth_change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return user;
}

export const ROLE_MENUS: Record<Role, { label: string; to: string; icon: string }[]> = {
  admin: [
    { label: "Dashboard", to: "/dashboard", icon: "LayoutDashboard" },
    { label: "Employees", to: "/employees", icon: "Users" },
    { label: "Attendance", to: "/attendance", icon: "CalendarCheck" },
    { label: "Daily Reports", to: "/daily-report", icon: "ClipboardList" },
    { label: "Tasks", to: "/tasks", icon: "ListTodo" },
    { label: "Leaves", to: "/leaves", icon: "CalendarOff" },
    { label: "Expenses", to: "/expenses", icon: "Receipt" },
    { label: "Salary Slips", to: "/salary-slips", icon: "WalletCards" },
    { label: "Holidays", to: "/holidays", icon: "CalendarDays" },
    { label: "Reports", to: "/reports", icon: "BarChart3" },
    { label: "Notifications", to: "/notifications", icon: "Bell" },
    { label: "Settings", to: "/settings", icon: "Settings" },
    { label: "Profile", to: "/profile", icon: "User" },
    { label: "Quotations", to: "/quotations", icon: "FileText" },
    { label: "Invoices", to: "/invoices", icon: "ReceiptText" },
    { label: "Data Scraping Report", to: "/data-scraping-report", icon: "Activity" },
  ],
  hr: [
    { label: "Dashboard", to: "/dashboard", icon: "LayoutDashboard" },
    { label: "Employees", to: "/employees", icon: "Users" },
    { label: "Daily Reports", to: "/daily-report", icon: "ClipboardList" },
    { label: "Tasks", to: "/tasks", icon: "ListTodo" },
    { label: "Leaves", to: "/leaves", icon: "CalendarOff" },
    { label: "Expenses", to: "/expenses", icon: "Receipt" },
    { label: "Salary Slips", to: "/salary-slips", icon: "WalletCards" },
    { label: "Holidays", to: "/holidays", icon: "CalendarDays" },
    { label: "Reports", to: "/reports", icon: "BarChart3" },
    { label: "Notifications", to: "/notifications", icon: "Bell" },
    { label: "Profile", to: "/profile", icon: "User" },
    { label: "Quotations", to: "/quotations", icon: "FileText" },
    { label: "Data Scraping Report", to: "/data-scraping-report", icon: "Activity" },
  ],
  employee: [
    { label: "Dashboard", to: "/dashboard", icon: "LayoutDashboard" },
    { label: "Daily Task Report", to: "/daily-report", icon: "ClipboardList" },
    { label: "My Tasks", to: "/tasks", icon: "ListTodo" },
    { label: "Attendance", to: "/attendance", icon: "CalendarCheck" },
    { label: "Activity", to: "/activity", icon: "Activity" },
    { label: "Leaves", to: "/leaves", icon: "CalendarOff" },
    { label: "Expenses", to: "/expenses", icon: "Receipt" },
    { label: "My Salary Slips", to: "/salary-slips", icon: "WalletCards" },
    { label: "Holidays", to: "/holidays", icon: "CalendarDays" },
    { label: "Notifications", to: "/notifications", icon: "Bell" },
    { label: "Profile", to: "/profile", icon: "User" },
    { label: "Quotations", to: "/quotations", icon: "FileText" },
    { label: "Data Scraping", to: "/data-scraping", icon: "Activity" },
  ],
};

