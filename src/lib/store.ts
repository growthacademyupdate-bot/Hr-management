import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { 
  getEmployees, addEmployee, updateEmployee, deleteEmployee,
  getTasks, addTask, updateTask, deleteTask, addComment,
  getLeaves, addLeave, updateLeave,
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
  id: string; title: string; description: string; assignedTo: string; priority: string; dueDate: string; status: string; progress: number; createdAt: string; comments: { author: string; text: string; time: string }[];
}
export interface Leave {
  id: string; employeeId: string; type: string; startDate: string; endDate: string; reason: string; status: string; appliedAt: string;
}
export interface Activity {
  id: string; employeeId: string; time: string; label: string; type: string;
}

interface DB {
  employees: Employee[]; attendance: AttendanceRecord[]; tasks: Task[]; leaves: Leave[]; activities: Activity[];
}

const AUTH_KEY = "ems_auth_v1";
let currentDB: DB = { employees: [], attendance: [], tasks: [], leaves: [], activities: [] };
const listeners = new Set<() => void>();

function notify() { listeners.forEach((l) => l()); }

export function useDB() {
  const snap = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => currentDB,
    () => currentDB
  );

  useEffect(() => {
    // Fetch real data on mount
    Promise.all([getEmployees(), getAttendance(), getTasks(), getLeaves(), getActivities()])
      .then(([emps, atts, ts, lvs, acts]) => {
        currentDB = { employees: emps, attendance: atts, tasks: ts, leaves: lvs, activities: acts };
        notify();
      })
      .catch(console.error);
  }, []);

  return snap;
}

export const api = {
  resetDB() { /* No-op for real DB */ },
  async addEmployee(emp: any) { const e = await addEmployee(emp); currentDB.employees = [e, ...currentDB.employees]; notify(); return e; },
  async updateEmployee(id: string, patch: any) { const e = await updateEmployee(id, patch); currentDB.employees = currentDB.employees.map(x => x.id === id ? e : x); notify(); },
  async deleteEmployee(id: string) { await deleteEmployee(id); currentDB.employees = currentDB.employees.filter(x => x.id !== id); notify(); },
  
  async addTask(task: any) { const t = await addTask(task); currentDB.tasks = [t, ...currentDB.tasks]; notify(); },
  async updateTask(id: string, patch: any) { const t = await updateTask(id, patch); currentDB.tasks = currentDB.tasks.map(x => x.id === id ? t : x); notify(); },
  async deleteTask(id: string) { await deleteTask(id); currentDB.tasks = currentDB.tasks.filter(x => x.id !== id); notify(); },
  async addComment(taskId: string, comment: any) { const t = await addComment(taskId, comment); currentDB.tasks = currentDB.tasks.map(x => x.id === taskId ? t : x); notify(); },
  
  async addLeave(leave: any) { const l = await addLeave(leave); currentDB.leaves = [l, ...currentDB.leaves]; notify(); },
  async updateLeave(id: string, patch: any) { const l = await updateLeave(id, patch); currentDB.leaves = currentDB.leaves.map(x => x.id === id ? l : x); notify(); },
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
