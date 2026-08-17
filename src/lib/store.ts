import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import {
  type Employee, type AttendanceRecord, type Task, type Leave, type Activity, type User, type Role,
  seedEmployees, seedAttendance, seedTasks, seedLeaves, seedActivities,
} from "./mock-data";

interface DB {
  employees: Employee[];
  attendance: AttendanceRecord[];
  tasks: Task[];
  leaves: Leave[];
  activities: Activity[];
}

const KEY = "ems_db_v1";
const AUTH_KEY = "ems_auth_v1";

const STATIC_USERS: User[] = [
  { id: "u_admin", username: "admin", password: "admin123", role: "admin", name: "Alex Admin", email: "admin@workmonitor.com", avatar: "https://i.pravatar.cc/120?u=admin" },
  { id: "u_hr", username: "hr", password: "hr123", role: "hr", name: "Hailey HR", email: "hr@workmonitor.com", avatar: "https://i.pravatar.cc/120?u=hr" },
];

function loadDB(): DB {
  if (typeof window === "undefined") return { employees: [], attendance: [], tasks: [], leaves: [], activities: [] };
  const raw = localStorage.getItem(KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }
  const employees = seedEmployees();
  const db: DB = {
    employees,
    attendance: seedAttendance(employees),
    tasks: seedTasks(employees),
    leaves: seedLeaves(employees),
    activities: seedActivities(employees),
  };
  localStorage.setItem(KEY, JSON.stringify(db));
  return db;
}

let db: DB | null = null;
const listeners = new Set<() => void>();

function getDB(): DB {
  if (!db) db = loadDB();
  return db;
}

function persist() {
  if (typeof window !== "undefined" && db) localStorage.setItem(KEY, JSON.stringify(db));
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function useDB() {
  // Track a version number so React re-renders.
  const snap = useSyncExternalStore(
    subscribe,
    () => {
      const d = getDB();
      return d;
    },
    () => ({ employees: [], attendance: [], tasks: [], leaves: [], activities: [] } as DB),
  );
  return snap;
}

export const api = {
  resetDB() {
    if (typeof window !== "undefined") localStorage.removeItem(KEY);
    db = null;
    getDB();
    persist();
  },
  // Employees
  addEmployee(emp: Omit<Employee, "id" | "avatar"> & { avatar?: string }) {
    const d = getDB();
    const nextNum = d.employees.length + 1;
    const id = `EMP${String(nextNum).padStart(3, "0")}`;
    const newEmp: Employee = { ...emp, id, avatar: emp.avatar || `https://i.pravatar.cc/120?u=${id}` };
    d.employees.push(newEmp);
    persist();
    return newEmp;
  },
  updateEmployee(id: string, patch: Partial<Employee>) {
    const d = getDB();
    d.employees = d.employees.map((e) => (e.id === id ? { ...e, ...patch } : e));
    persist();
  },
  deleteEmployee(id: string) {
    const d = getDB();
    d.employees = d.employees.filter((e) => e.id !== id);
    persist();
  },
  // Tasks
  addTask(task: Omit<Task, "id" | "createdAt" | "comments">) {
    const d = getDB();
    const nextNum = d.tasks.length + 1;
    d.tasks.push({ ...task, id: `TASK${String(nextNum).padStart(3, "0")}`, createdAt: new Date().toISOString(), comments: [] });
    persist();
  },
  updateTask(id: string, patch: Partial<Task>) {
    const d = getDB();
    d.tasks = d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
    persist();
  },
  deleteTask(id: string) {
    const d = getDB();
    d.tasks = d.tasks.filter((t) => t.id !== id);
    persist();
  },
  addComment(taskId: string, comment: { author: string; text: string }) {
    const d = getDB();
    d.tasks = d.tasks.map((t) => t.id === taskId ? { ...t, comments: [...t.comments, { ...comment, time: new Date().toISOString() }] } : t);
    persist();
  },
  // Leaves
  addLeave(leave: Omit<Leave, "id" | "appliedAt" | "status">) {
    const d = getDB();
    const nextNum = d.leaves.length + 1;
    d.leaves.push({ ...leave, id: `LV${String(nextNum).padStart(3, "0")}`, appliedAt: new Date().toISOString(), status: "Pending" });
    persist();
  },
  updateLeave(id: string, patch: Partial<Leave>) {
    const d = getDB();
    d.leaves = d.leaves.map((l) => l.id === id ? { ...l, ...patch } : l);
    persist();
  },
  // Attendance / Activity (simulate login/logout)
  logLogin(employeeId: string) {
    const d = getDB();
    const date = new Date().toISOString().slice(0, 10);
    const time = new Date().toTimeString().slice(0, 5);
    const existing = d.attendance.find((a) => a.employeeId === employeeId && a.date === date);
    if (existing) {
      if (!existing.loginTime) existing.loginTime = time;
    } else {
      d.attendance.push({
        id: `${employeeId}-${date}`,
        employeeId, date, loginTime: time, logoutTime: null, workingHours: 0, status: "Present", productivity: 80,
      });
    }
    d.activities.push({ id: `ACT${Date.now()}`, employeeId, time: new Date().toISOString(), label: "Logged in", type: "login" });
    persist();
  },
  logLogout(employeeId: string) {
    const d = getDB();
    const date = new Date().toISOString().slice(0, 10);
    const time = new Date().toTimeString().slice(0, 5);
    const rec = d.attendance.find((a) => a.employeeId === employeeId && a.date === date);
    if (rec && rec.loginTime) {
      rec.logoutTime = time;
      const [lh, lm] = rec.loginTime.split(":").map(Number);
      const [oh, om] = time.split(":").map(Number);
      rec.workingHours = Math.max(0, +((oh * 60 + om - lh * 60 - lm) / 60).toFixed(1));
    }
    d.activities.push({ id: `ACT${Date.now()}`, employeeId, time: new Date().toISOString(), label: "Logged out", type: "logout" });
    persist();
  },
};

// Auth
export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function login(usernameOrId: string, password: string): User | null {
  const u = STATIC_USERS.find((u) => u.username === usernameOrId && u.password === password);
  if (u) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(u));
    window.dispatchEvent(new Event("ems_auth_change"));
    return u;
  }
  // employee login
  const d = getDB();
  const emp = d.employees.find((e) => e.email.toLowerCase() === usernameOrId.toLowerCase() && e.password === password);
  if (emp) {
    const user: User = {
      id: `u_${emp.id}`, username: emp.email, password: emp.password, role: "employee",
      employeeId: emp.id, name: emp.name, email: emp.email, avatar: emp.avatar,
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    api.logLogin(emp.id);
    window.dispatchEvent(new Event("ems_auth_change"));
    return user;
  }
  return null;
}

export function logout() {
  const user = getCurrentUser();
  if (user?.employeeId) api.logLogout(user.employeeId);
  localStorage.removeItem(AUTH_KEY);
  db = null; // Reset database cache to force reload from localStorage
  window.dispatchEvent(new Event("ems_auth_change"));
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  useEffect(() => {
    const handler = () => setUser(getCurrentUser());
    window.addEventListener("ems_auth_change", handler);
    window.addEventListener("storage", handler);

    // Handle laptop sleep/wake detection
    let hiddenTime: number | null = null;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenTime = Date.now();
      } else if (hiddenTime) {
        const timeHidden = Date.now() - hiddenTime;
        // If page was hidden for more than 5 minutes, auto-logout employee
        if (timeHidden > 5 * 60 * 1000 && user?.role === "employee") {
          logout();
          toast.error("Auto-logged out due to inactivity");
        }
        hiddenTime = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("ems_auth_change", handler);
      window.removeEventListener("storage", handler);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user]);
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
