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
  try {
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
  } catch (error: any) {
    console.error("Login Action Error:", error);
    return { success: false, error: "Database connection or server error. If using MongoDB Atlas, please ensure your IP address is whitelisted." };
  }
}

// ---------------- Employees ----------------
export async function getEmployees() {
  await connectDB();
  const emps = await Employee.find({}).sort({ createdAt: -1 }).lean();
  return serialize(emps);
}

export async function addEmployee(data: any) {
  await connectDB();
  const all = await Employee.find({}, { id: 1 }).lean();
  let max = 0;
  for (const doc of all) {
    const num = parseInt((doc as any).id.replace("EMP", ""), 10);
    if (!isNaN(num) && num > max) max = num;
  }
  const id = `EMP${String(max + 1).padStart(3, "0")}`;
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
export async function getTasks(userRole?: string, userId?: string) {
  await connectDB();
  if (userRole === "employee" && userId) {
    const tasks = await Task.find({ assignedTo: userId }).sort({ createdAt: -1 }).lean();
    return serialize(tasks);
  }
  // Admin and HR can see all tasks
  const tasks = await Task.find({}).sort({ createdAt: -1 }).lean();
  return serialize(tasks);
}

export async function addTask(data: any, userRole: string, userId: string) {
  await connectDB();
  if (userRole !== "admin") throw new Error("Only Admin can create tasks");

  const all = await Task.find({}, { id: 1 }).lean();
  let max = 0;
  for (const doc of all) {
    const num = parseInt((doc as any).id.replace("TASK", ""), 10);
    if (!isNaN(num) && num > max) max = num;
  }
  const id = `TASK${String(max + 1).padStart(3, "0")}`;
  const task = await Task.create({
    ...data,
    id,
    assignedBy: userId,
    status: "assigned",
    assignDate: data.assignDate || new Date().toISOString().slice(0, 10),
    comments: []
  });
  return serialize(task);
}

export async function updateTask(id: string, data: any, userId: string, userRole: string) {
  await connectDB();
  if (userRole !== "admin" && userRole !== "hr") {
    throw new Error("Only Admin and HR can edit tasks");
  }
  const task = await Task.findOneAndUpdate({ id }, data, { new: true }).lean();
  return serialize(task);
}

export async function updateTaskStatus(taskId: string, status: string, userId: string, userRole: string) {
  await connectDB();
  const task = await Task.findOne({ id: taskId });
  if (!task) throw new Error("Task not found");
  
  if (userRole === "employee" && task.assignedTo !== userId) {
    throw new Error("Unauthorized: You can only update your own tasks");
  }

  if (status === task.status) {
    return serialize(task);
  }

  if (status === "working_progress" && task.status === "assigned") {
    task.status = "working_progress";
    task.startedAt = new Date().toISOString();
  } else if (status === "completed" && task.status === "working_progress") {
    task.status = "completed";
    task.completedAt = new Date().toISOString();
  } else {
    throw new Error(`Invalid status transition from '${task.status}' to '${status}' (Types: ${typeof task.status}, ${typeof status})`);
  }

  await task.save();
  return serialize(task);
}

export async function reviewTask(taskId: string, review: { hrRating: "very good" | "good" | "average" | "poor" | string; hrReview: string }, userId: string, userRole: string) {
  await connectDB();
  if (userRole !== "hr" && userRole !== "admin") throw new Error("Unauthorized");

  const task = await Task.findOne({ id: taskId });
  if (!task) throw new Error("Task not found");
  if (task.status !== "completed") throw new Error("Can only review completed tasks");

  task.hrRating = review.hrRating as any;
  task.hrReview = review.hrReview;
  task.reviewedBy = userId;
  task.reviewedAt = new Date().toISOString();
  task.status = "reviewed";

  await task.save();
  return serialize(task);
}

export async function deleteTask(id: string, userId: string, userRole: string) {
  await connectDB();
  const task = await Task.findOne({ id });
  if (!task) throw new Error("Task not found");

  if (userRole === "employee" && task.assignedTo !== userId) {
    throw new Error("Unauthorized to delete this task");
  }

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
export async function getLeaves(userRole?: string, userId?: string) {
  await connectDB();
  if (userRole === "employee" && userId) {
    const leaves = await Leave.find({ employeeId: userId }).sort({ createdAt: -1 }).lean();
    return serialize(leaves);
  }
  const leaves = await Leave.find({}).sort({ createdAt: -1 }).lean();
  return serialize(leaves);
}

export async function addLeave(data: any, userId: string) {
  await connectDB();
  
  // Overlap validation
  const existingLeaves = await Leave.find({ 
    employeeId: userId,
    status: { $in: ["pending", "hr_approved", "admin_approved"] }
  }).lean();
  
  const newStart = new Date(data.startDate).getTime();
  const newEnd = new Date(data.endDate).getTime();
  
  for (const l of existingLeaves) {
    const exStart = new Date((l as any).startDate).getTime();
    const exEnd = new Date((l as any).endDate).getTime();
    if (newStart <= exEnd && newEnd >= exStart) {
      throw new Error("You already have an overlapping leave request during this period.");
    }
  }

  const all = await Leave.find({}, { id: 1 }).lean();
  let max = 0;
  for (const doc of all) {
    const num = parseInt((doc as any).id.replace("LV", ""), 10);
    if (!isNaN(num) && num > max) max = num;
  }
  
  const id = `LV${String(max + 1).padStart(3, "0")}`;
  
  // Calculate days (inclusive)
  const days = Math.round((newEnd - newStart) / (1000 * 60 * 60 * 24)) + 1;
  
  const leave = await Leave.create({
    ...data,
    id,
    employeeId: userId,
    numberOfDays: days,
    appliedAt: new Date().toISOString(),
    status: "pending"
  });
  return serialize(leave);
}

export async function cancelLeave(leaveId: string, userId: string) {
  await connectDB();
  const leave = await Leave.findOne({ id: leaveId });
  if (!leave) throw new Error("Leave not found");
  if (leave.employeeId !== userId) throw new Error("Unauthorized");
  if (leave.status !== "pending") throw new Error("Can only cancel pending leaves");
  
  leave.status = "cancelled";
  leave.cancelledBy = userId;
  leave.cancelledAt = new Date().toISOString();
  await leave.save();
  return serialize(leave);
}

export async function hrReviewLeave(leaveId: string, action: "approve" | "reject", comment: string, hrId: string, userRole: string) {
  await connectDB();
  if (userRole !== "hr" && userRole !== "admin") throw new Error("Unauthorized");
  
  const leave = await Leave.findOne({ id: leaveId });
  if (!leave) throw new Error("Leave not found");
  if (leave.status !== "pending") throw new Error("Leave is not pending HR review");
  
  if (action === "reject" && !comment) throw new Error("Rejection comment is required");
  
  leave.status = action === "approve" ? "hr_approved" : "hr_rejected";
  leave.hrReviewedBy = hrId;
  leave.hrReviewedAt = new Date().toISOString();
  leave.hrReviewComment = comment || null;
  
  await leave.save();
  return serialize(leave);
}

export async function adminReviewLeave(leaveId: string, action: "approve" | "reject", comment: string, adminId: string, userRole: string) {
  await connectDB();
  if (userRole !== "admin") throw new Error("Unauthorized");
  
  const leave = await Leave.findOne({ id: leaveId });
  if (!leave) throw new Error("Leave not found");
  if (leave.status !== "hr_approved") throw new Error("Leave must be HR approved first");
  
  if (action === "reject" && !comment) throw new Error("Rejection comment is required");
  
  leave.status = action === "approve" ? "admin_approved" : "admin_rejected";
  leave.adminReviewedBy = adminId;
  leave.adminReviewedAt = new Date().toISOString();
  leave.adminReviewComment = comment || null;
  
  await leave.save();
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
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5);
  
  let existing = await Attendance.findOne({ employeeId, date });
  
  if (!existing) {
    existing = new Attendance({
      id: `${employeeId}-${date}`,
      employeeId,
      date,
      firstLoginAt: now,
      sessions: [],
      status: "Incomplete",
      productivity: 80,
      loginTime: time, // Legacy support
    });
  }
  
  // Check for active session
  const activeSession = existing.sessions?.find((s: any) => !s.logoutAt);
  if (!activeSession) {
    existing.sessions.push({ loginAt: now });
    if (!existing.firstLoginAt) existing.firstLoginAt = now;
    existing.loginTime = time; // Update legacy for UI
    await existing.save();
  }
  
  await Activity.create({
    id: `ACT${Date.now()}`,
    employeeId,
    time: now.toISOString(),
    label: "Logged in",
    type: "login"
  });
}

export async function logLogoutActivity(employeeId: string) {
  await connectDB();
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5);
  
  const rec = await Attendance.findOne({ employeeId, date });
  if (rec) {
    const activeSession = rec.sessions?.find((s: any) => !s.logoutAt);
    if (activeSession) {
      activeSession.logoutAt = now;
      activeSession.durationSeconds = Math.floor((now.getTime() - activeSession.loginAt.getTime()) / 1000);
      
      rec.totalWorkingSeconds = (rec.totalWorkingSeconds || 0) + activeSession.durationSeconds;
      rec.totalWorkingHours = Number((rec.totalWorkingSeconds / 3600).toFixed(2));
      rec.workingHours = rec.totalWorkingHours; // Legacy
      rec.lastLogoutAt = now;
      rec.logoutTime = time; // Legacy
      
      if (rec.totalWorkingHours >= 8) rec.status = "Present";
      else if (rec.totalWorkingHours >= 4) rec.status = "Half Day";
      else if (rec.totalWorkingHours > 0) rec.status = "Short Day";
      else rec.status = "Incomplete";
      
      await rec.save();
    }
  }
  
  await Activity.create({
    id: `ACT${Date.now()}`,
    employeeId,
    time: now.toISOString(),
    label: "Logged out",
    type: "logout"
  });
  
  return { success: true };
}

export async function deleteAttendance(id: string, userRole: string) {
  await connectDB();
  if (userRole !== "admin") throw new Error("Only Admin can delete attendance records");
  const att = await Attendance.findOne({ id });
  if (!att) throw new Error("Attendance record not found");
  
  await Attendance.findOneAndDelete({ id });
  return { success: true };
}
