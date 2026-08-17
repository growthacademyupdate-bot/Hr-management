// Mock data for the Employee Monitoring System
export type Role = "admin" | "hr" | "employee";

export interface User {
  id: string;
  username: string;
  password: string;
  role: Role;
  employeeId?: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Employee {
  id: string; // EMP001
  name: string;
  email: string;
  mobile: string;
  department: string;
  designation: string;
  joiningDate: string;
  salary: number;
  status: "Active" | "Inactive" | "On Leave";
  avatar: string;
  password: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  loginTime: string | null;
  logoutTime: string | null;
  workingHours: number;
  status: "Present" | "Absent" | "Leave" | "Half Day";
  productivity: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // employee id
  priority: "High" | "Medium" | "Low";
  dueDate: string;
  status: "Pending" | "In Progress" | "Completed";
  progress: number;
  createdAt: string;
  comments: { author: string; text: string; time: string }[];
}

export interface Leave {
  id: string;
  employeeId: string;
  type: "Casual" | "Sick" | "Earned" | "Unpaid";
  startDate: string;
  endDate: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  appliedAt: string;
}

export interface Activity {
  id: string;
  employeeId: string;
  time: string; // ISO
  label: string;
  type: "login" | "task" | "break" | "logout" | "complete";
}

const DEPARTMENTS = ["Design", "Marketing", "Sales", "HR", "Web", "Finance", "Operations"];
const DESIGNATIONS: Record<string, string[]> = {
  Design: ["UI Designer", "UX Designer", "Design Lead"],
  Marketing: ["Marketing Specialist", "Content Strategist", "Marketing Manager"],
  Sales: ["Sales Executive", "Account Manager", "Sales Director"],
  HR: ["HR Executive", "HR Manager"],
  Web: ["Web Developer", "Frontend Developer", "Backend Developer", "Full Stack Developer"],
  Finance: ["Accountant", "Finance Manager"],
  Operations: ["Operations Analyst", "Operations Manager"],
};

const FIRST = ["Aarav","Vivaan","Aditya","Vihaan","Arjun","Sai","Reyansh","Krishna","Ishaan","Rohan","Priya","Ananya","Diya","Saanvi","Aadhya","Myra","Sara","Riya","Anika","Pari","Liam","Noah","Ethan","Mason","Logan","Emma","Olivia","Ava","Isabella","Sophia"];
const LAST = ["Sharma","Verma","Patel","Gupta","Reddy","Kumar","Singh","Khan","Mehta","Iyer","Smith","Johnson","Brown","Davis","Wilson","Anderson","Taylor","Thomas","Moore","Martin"];

function pad(n: number, len = 3) { return String(n).padStart(len, "0"); }
function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

export function seedEmployees(): Employee[] {
  const list: Employee[] = [];
  for (let i = 1; i <= 25; i++) {
    const dept = rand(DEPARTMENTS);
    const name = `${rand(FIRST)} ${rand(LAST)}`;
    const id = `EMP${pad(i)}`;
    list.push({
      id,
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@workmonitor.com`,
      mobile: `+91 9${randInt(100000000, 999999999)}`,
      department: dept,
      designation: rand(DESIGNATIONS[dept]),
      joiningDate: new Date(2020 + randInt(0, 4), randInt(0, 11), randInt(1, 28)).toISOString().slice(0, 10),
      salary: randInt(40, 180) * 1000,
      status: Math.random() > 0.15 ? "Active" : (Math.random() > 0.5 ? "On Leave" : "Inactive"),
      avatar: `https://i.pravatar.cc/120?u=${id}`,
      password: "emp123",
    });
  }
  return list;
}

export function seedAttendance(employees: Employee[]): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  for (const emp of employees) {
    for (let d = 0; d < 30; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - d);
      const dateStr = date.toISOString().slice(0, 10);
      const dow = date.getDay();
      if (dow === 0 || dow === 6) continue;
      const r = Math.random();
      let status: AttendanceRecord["status"] = "Present";
      let login: string | null = `${pad(randInt(8, 10), 2)}:${pad(randInt(0, 59), 2)}`;
      let logout: string | null = `${pad(randInt(17, 19), 2)}:${pad(randInt(0, 59), 2)}`;
      let hours = randInt(7, 9) + Math.random();
      if (r < 0.08) { status = "Absent"; login = null; logout = null; hours = 0; }
      else if (r < 0.12) { status = "Leave"; login = null; logout = null; hours = 0; }
      else if (r < 0.18) { status = "Half Day"; hours = 4 + Math.random(); }
      // For today's date, don't set fake logout time - it should be set when employee actually logs out
      if (dateStr === todayStr) {
        logout = null;
        hours = 0;
      }
      records.push({
        id: `${emp.id}-${dateStr}`,
        employeeId: emp.id,
        date: dateStr,
        loginTime: login,
        logoutTime: logout,
        workingHours: +hours.toFixed(1),
        status,
        productivity: status === "Present" ? randInt(70, 98) : status === "Half Day" ? randInt(40, 65) : 0,
      });
    }
  }
  return records;
}

const TASK_TITLES = [
  "Implement user authentication","Design landing page","Fix payment bug","Quarterly report","Client onboarding flow",
  "Database migration","API documentation","Mobile responsive fixes","Customer survey analysis","Marketing campaign launch",
  "Code review batch","Security audit","Performance optimization","UI component library","User research interviews",
  "Sales pipeline review","Onboard new vendor","Refactor legacy module","Build analytics dashboard","Weekly team sync",
];

export function seedTasks(employees: Employee[]): Task[] {
  const tasks: Task[] = [];
  for (let i = 1; i <= 50; i++) {
    const emp = rand(employees);
    const statuses: Task["status"][] = ["Pending", "In Progress", "Completed"];
    const status = rand(statuses);
    const progress = status === "Completed" ? 100 : status === "In Progress" ? randInt(20, 80) : 0;
    const due = new Date();
    due.setDate(due.getDate() + randInt(-5, 20));
    tasks.push({
      id: `TASK${pad(i)}`,
      title: rand(TASK_TITLES),
      description: "Complete the assigned work item according to the project specifications and acceptance criteria.",
      assignedTo: emp.id,
      priority: rand(["High", "Medium", "Low"] as const),
      dueDate: due.toISOString().slice(0, 10),
      status,
      progress,
      createdAt: new Date(Date.now() - randInt(1, 20) * 86400000).toISOString(),
      comments: [],
    });
  }
  return tasks;
}

export function seedLeaves(employees: Employee[]): Leave[] {
  const leaves: Leave[] = [];
  for (let i = 1; i <= 15; i++) {
    const emp = rand(employees);
    const start = new Date();
    start.setDate(start.getDate() + randInt(-15, 15));
    const end = new Date(start);
    end.setDate(start.getDate() + randInt(1, 5));
    leaves.push({
      id: `LV${pad(i)}`,
      employeeId: emp.id,
      type: rand(["Casual", "Sick", "Earned", "Unpaid"] as const),
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      reason: "Personal reasons / family event / medical appointment.",
      status: rand(["Pending", "Approved", "Rejected"] as const),
      appliedAt: new Date(Date.now() - randInt(1, 30) * 86400000).toISOString(),
    });
  }
  return leaves;
}

export function seedActivities(employees: Employee[]): Activity[] {
  const acts: Activity[] = [];
  const today = new Date().toISOString().slice(0, 10);
  let counter = 0;
  for (const emp of employees.slice(0, 15)) {
    const items: { time: string; label: string; type: Activity["type"] }[] = [
      { time: "09:00", label: "Logged in", type: "login" },
      { time: "09:15", label: "Started task: " + rand(TASK_TITLES), type: "task" },
      { time: "13:00", label: "Lunch break", type: "break" },
      { time: "13:45", label: "Resumed work", type: "task" },
      { time: "16:30", label: "Completed task", type: "complete" },
      { time: "18:00", label: "Logged out", type: "logout" },
    ];
    for (const it of items) {
      acts.push({
        id: `ACT${pad(++counter, 4)}`,
        employeeId: emp.id,
        time: `${today}T${it.time}:00`,
        label: it.label,
        type: it.type,
      });
    }
  }
  return acts;
}
