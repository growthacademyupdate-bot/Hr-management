import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { 
  getEmployees, addEmployee, updateEmployee, deleteEmployee,
  getTasks, addTask, updateTask, deleteTask, addComment, updateTaskStatus, reviewTask,
  getLeaves, addLeave, cancelLeave, hrReviewLeave, adminReviewLeave,
  getAttendance, getActivities, logLogoutActivity
} from "@/app/actions";

export type Role = "admin" | "hr" | "employee";
export interface User {
  id: string; username: string; password?: string; role: Role; name: string; email: string; avatar?: string; employeeId?: string;
}
export interface Employee {
  id: string; name: string; email: string; mobile: string; department: string; designation: string; joiningDate: string; salary: number; status: string; avatar?: string; password?: string;
}
export interface AttendanceRecord {
  id: string; employeeId: string; date: string; loginTime: string | null; logoutTime: string | null; workingHours: number; status: string; productivity: number;
}
export interface Task {
  id: string; title: string; description: string; assignedTo: string; assignedBy: string; priority: "low" | "medium" | "high" | "urgent"; status: "assigned" | "working_progress" | "completed" | "reviewed"; assignDate: string; dueDate: string; startedAt: string | null; completedAt: string | null; reviewedAt: string | null; hrRating: string | null; hrReview: string | null; reviewedBy: string | null; createdAt: string; updatedAt: string;
}
export interface Leave {
  id: string; employeeId: string; type: "Casual Leave" | "Sick Leave" | "Earned Leave" | "Emergency Leave" | "Other"; startDate: string; endDate: string; numberOfDays: number; reason: string; status: "pending" | "hr_approved" | "hr_rejected" | "admin_approved" | "admin_rejected" | "cancelled"; appliedAt: string; hrReviewedBy?: string | null; hrReviewedAt?: string | null; hrReviewComment?: string | null; adminReviewedBy?: string | null; adminReviewedAt?: string | null; adminReviewComment?: string | null; cancelledBy?: string | null; cancelledAt?: string | null;
}
export interface Activity {
  id: string; employeeId: string; time: string; label: string; type: string;
}

interface DB {
  employees: Employee[]; attendance: AttendanceRecord[]; tasks: Task[]; leaves: Leave[]; activities: Activity[];
}

const AUTH_KEY = "ems_auth_v1";
let currentDB: DB = { employees: [], attendance: [], tasks: [], leaves: [], activities: [] };
let globalSearch = "";
const listeners = new Set<() => void>();

function notify() { listeners.forEach((l) => l()); }

export function useDB() {
  const snap = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => currentDB,
    () => currentDB
  );

  useEffect(() => {
    const user = getCurrentUser();
    // Fetch real data on mount
    Promise.all([getEmployees(), getAttendance(), getTasks(user?.role, user?.employeeId || user?.id), getLeaves(user?.role, user?.employeeId || user?.id), getActivities()])
      .then(([emps, atts, ts, lvs, acts]) => {
        currentDB = { employees: emps, attendance: atts, tasks: ts, leaves: lvs, activities: acts };
        notify();
      })
      .catch(console.error);
  }, []);

  return snap;
}

export function useGlobalSearch() {
  const snap = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => globalSearch,
    () => globalSearch
  );
  return snap;
}

export const api = {
  resetDB() { /* No-op for real DB */ },
  setGlobalSearch(q: string) { globalSearch = q; notify(); },
  async addEmployee(emp: any) { const e = await addEmployee(emp); currentDB.employees = [e, ...currentDB.employees]; notify(); return e; },
  async updateEmployee(id: string, patch: any) { const e = await updateEmployee(id, patch); currentDB.employees = currentDB.employees.map(x => x.id === id ? e : x); notify(); },
  async deleteEmployee(id: string) { await deleteEmployee(id); currentDB.employees = currentDB.employees.filter(x => x.id !== id); notify(); },
  
  async addTask(task: any) { const user = getCurrentUser(); if(!user) return; const t = await addTask(task, user.role, user.employeeId || user.id); currentDB.tasks = [t, ...currentDB.tasks]; notify(); return t; },
  async updateTask(id: string, patch: any) { const user = getCurrentUser(); if(!user) return; const t = await updateTask(id, patch, user.employeeId || user.id, user.role); currentDB.tasks = currentDB.tasks.map(x => x.id === id ? t : x); notify(); },
  async deleteTask(id: string) { const user = getCurrentUser(); if(!user) return; await deleteTask(id, user.employeeId || user.id, user.role); currentDB.tasks = currentDB.tasks.filter(x => x.id !== id); notify(); },
  async updateTaskStatus(taskId: string, status: string) { const user = getCurrentUser(); if(!user) return; const t = await updateTaskStatus(taskId, status, user.employeeId || user.id, user.role); currentDB.tasks = currentDB.tasks.map(x => x.id === taskId ? t : x); notify(); },
  async reviewTask(taskId: string, review: { hrRating: string; hrReview: string }) { const user = getCurrentUser(); if(!user) return; const t = await reviewTask(taskId, review, user.employeeId || user.id, user.role); currentDB.tasks = currentDB.tasks.map(x => x.id === taskId ? t : x); notify(); },
  
  async addLeave(leave: any) { const user = getCurrentUser(); if(!user) return; const l = await addLeave(leave, user.employeeId || user.id); currentDB.leaves = [l, ...currentDB.leaves]; notify(); return l; },
  async cancelLeave(leaveId: string) { const user = getCurrentUser(); if(!user) return; const l = await cancelLeave(leaveId, user.employeeId || user.id); currentDB.leaves = currentDB.leaves.map(x => x.id === leaveId ? l : x); notify(); },
  async hrReviewLeave(leaveId: string, action: "approve" | "reject", comment: string) { const user = getCurrentUser(); if(!user) return; const l = await hrReviewLeave(leaveId, action, comment, user.employeeId || user.id, user.role); currentDB.leaves = currentDB.leaves.map(x => x.id === leaveId ? l : x); notify(); },
  async adminReviewLeave(leaveId: string, action: "approve" | "reject", comment: string) { const user = getCurrentUser(); if(!user) return; const l = await adminReviewLeave(leaveId, action, comment, user.employeeId || user.id, user.role); currentDB.leaves = currentDB.leaves.map(x => x.id === leaveId ? l : x); notify(); },
};

// Auth
export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
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
    { label: "Tasks", to: "/tasks", icon: "ListTodo" },
    { label: "Leaves", to: "/leaves", icon: "CalendarOff" },
    { label: "Reports", to: "/reports", icon: "BarChart3" },
    { label: "Settings", to: "/settings", icon: "Settings" },
  ],
  hr: [
    { label: "Dashboard", to: "/dashboard", icon: "LayoutDashboard" },
    { label: "Employees", to: "/employees", icon: "Users" },
    { label: "Tasks", to: "/tasks", icon: "ListTodo" },
    { label: "Leaves", to: "/leaves", icon: "CalendarOff" },
    { label: "Reports", to: "/reports", icon: "BarChart3" },
  ],
  employee: [
    { label: "Dashboard", to: "/dashboard", icon: "LayoutDashboard" },
    { label: "My Tasks", to: "/tasks", icon: "ListTodo" },
    { label: "Attendance", to: "/attendance", icon: "CalendarCheck" },
    { label: "Activity", to: "/activity", icon: "Activity" },
    { label: "Leaves", to: "/leaves", icon: "CalendarOff" },
    { label: "Profile", to: "/profile", icon: "User" },
  ],
};
