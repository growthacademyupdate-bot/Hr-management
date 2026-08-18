"use server";

import connectDB from "@/lib/mongoose";
import { Employee } from "@/models/Employee";
import { Task } from "@/models/Task";
import { Leave } from "@/models/Leave";
import { Attendance } from "@/models/Attendance";
import { Activity } from "@/models/Activity";

// Helper to serialize Mongoose documents
function serialize(doc: any) {
  return JSON.parse(JSON.stringify(doc));
}

export async function loginAction(usernameOrId: string, password: string) {
  await connectDB();
  
  // Check against env admin credentials
  if (usernameOrId === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    return {
      success: true,
      user: {
        id: "u_admin",
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
        role: "admin",
        name: "Admin User",
        email: process.env.ADMIN_USERNAME,
        avatar: "https://i.pravatar.cc/120?u=admin",
      }
    };
  }

  // Check against env HR credentials
  if (usernameOrId === process.env.HR_USERNAME && password === process.env.HR_PASSWORD) {
    return {
      success: true,
      user: {
        id: "u_hr",
        username: process.env.HR_USERNAME,
        password: process.env.HR_PASSWORD,
        role: "hr",
        name: "HR Manager",
        email: process.env.HR_USERNAME,
        avatar: "https://i.pravatar.cc/120?u=hr",
      }
    };
  }

  // Check employees
  const emp = await Employee.findOne({ email: new RegExp(`^${usernameOrId}$`, "i"), password });
  if (emp) {
    // Log login activity
    await logLoginActivity(emp.id);
    return {
      success: true,
      user: {
        id: `u_${emp.id}`,
        username: emp.email,
        password: emp.password,
        role: "employee",
        employeeId: emp.id,
        name: emp.name,
        email: emp.email,
        avatar: emp.avatar,
      }
    };
  }

  return { success: false, error: "Invalid credentials" };
}

// ---------------- Employees ----------------
export async function getEmployees() {
  await connectDB();
  const emps = await Employee.find({}).sort({ createdAt: -1 }).lean();
  return serialize(emps);
}

export async function addEmployee(data: any) {
  await connectDB();
  const count = await Employee.countDocuments();
  const id = `EMP${String(count + 1).padStart(3, "0")}`;
  const emp = await Employee.create({
    ...data,
    id,
    avatar: data.avatar || `https://i.pravatar.cc/120?u=${id}`
  });
  return serialize(emp);
}

export async function updateEmployee(id: string, data: any) {
  await connectDB();
  const emp = await Employee.findOneAndUpdate({ id }, data, { new: true }).lean();
  return serialize(emp);
}

export async function deleteEmployee(id: string) {
  await connectDB();
  await Employee.findOneAndDelete({ id });
  return { success: true };
}

// ---------------- Tasks ----------------
export async function getTasks() {
  await connectDB();
  const tasks = await Task.find({}).sort({ createdAt: -1 }).lean();
  return serialize(tasks);
}

export async function addTask(data: any) {
  await connectDB();
  const count = await Task.countDocuments();
  const id = `TASK${String(count + 1).padStart(3, "0")}`;
  const task = await Task.create({
    ...data,
    id,
    createdAt: new Date().toISOString(),
    comments: []
  });
  return serialize(task);
}

export async function updateTask(id: string, data: any) {
  await connectDB();
  const task = await Task.findOneAndUpdate({ id }, data, { new: true }).lean();
  return serialize(task);
}

export async function deleteTask(id: string) {
  await connectDB();
  await Task.findOneAndDelete({ id });
  return { success: true };
}

export async function addComment(taskId: string, comment: { author: string; text: string }) {
  await connectDB();
  const task = await Task.findOneAndUpdate(
    { id: taskId },
    { $push: { comments: { ...comment, time: new Date().toISOString() } } },
    { new: true }
  ).lean();
  return serialize(task);
}

// ---------------- Leaves ----------------
export async function getLeaves() {
  await connectDB();
  const leaves = await Leave.find({}).sort({ createdAt: -1 }).lean();
  return serialize(leaves);
}

export async function addLeave(data: any) {
  await connectDB();
  const count = await Leave.countDocuments();
  const id = `LV${String(count + 1).padStart(3, "0")}`;
  const leave = await Leave.create({
    ...data,
    id,
    appliedAt: new Date().toISOString(),
    status: "Pending"
  });
  return serialize(leave);
}

export async function updateLeave(id: string, data: any) {
  await connectDB();
  const leave = await Leave.findOneAndUpdate({ id }, data, { new: true }).lean();
  return serialize(leave);
}

// ---------------- Attendance & Activity ----------------
export async function getAttendance() {
  await connectDB();
  const att = await Attendance.find({}).sort({ createdAt: -1 }).lean();
  return serialize(att);
}

export async function getActivities() {
  await connectDB();
  const acts = await Activity.find({}).sort({ createdAt: -1 }).lean();
  return serialize(acts);
}

async function logLoginActivity(employeeId: string) {
  const date = new Date().toISOString().slice(0, 10);
  const time = new Date().toTimeString().slice(0, 5);
  
  const existing = await Attendance.findOne({ employeeId, date });
  if (existing) {
    if (!existing.loginTime) {
      existing.loginTime = time;
      await existing.save();
    }
  } else {
    await Attendance.create({
      id: `${employeeId}-${date}`,
      employeeId,
      date,
      loginTime: time,
      status: "Present",
      productivity: 80
    });
  }
  
  await Activity.create({
    id: `ACT${Date.now()}`,
    employeeId,
    time: new Date().toISOString(),
    label: "Logged in",
    type: "login"
  });
}

export async function logLogoutActivity(employeeId: string) {
  await connectDB();
  const date = new Date().toISOString().slice(0, 10);
  const time = new Date().toTimeString().slice(0, 5);
  
  const rec = await Attendance.findOne({ employeeId, date });
  if (rec && rec.loginTime) {
    rec.logoutTime = time;
    const [lh, lm] = rec.loginTime.split(":").map(Number);
    const [oh, om] = time.split(":").map(Number);
    rec.workingHours = Math.max(0, +((oh * 60 + om - lh * 60 - lm) / 60).toFixed(1));
    await rec.save();
  }
  
  await Activity.create({
    id: `ACT${Date.now()}`,
    employeeId,
    time: new Date().toISOString(),
    label: "Logged out",
    type: "logout"
  });
  
  return { success: true };
}
