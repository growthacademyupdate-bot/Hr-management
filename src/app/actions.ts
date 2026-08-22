"use server";

import connectDB from "@/lib/mongoose";
import { Employee } from "@/models/Employee";
import { Task } from "@/models/Task";
import { Leave } from "@/models/Leave";
import { Attendance } from "@/models/Attendance";
import { Activity } from "@/models/Activity";
import { Setting } from "@/models/Setting";

// Helper to serialize Mongoose documents
function serialize(doc: any) {
  return JSON.parse(JSON.stringify(doc));
}

export async function createActivity(data: {
  employeeId: string;
  actorId?: string;
  actorRole?: string;
  activityType: string;
  module: string;
  referenceId?: string;
  message: string;
  metadata?: any;
}) {
  await Activity.create({
    id: `ACT${Date.now()}${Math.floor(Math.random() * 1000)}`,
    employeeId: data.employeeId,
    actorId: data.actorId,
    actorRole: data.actorRole,
    type: data.activityType,
    module: data.module,
    referenceId: data.referenceId,
    label: data.message,
    metadata: data.metadata,
    time: new Date().toISOString()
  });
}

export async function loginAction(usernameOrId: string, password: string) {
  try {
    await connectDB();
    
    // Check against env admin credentials
    if (usernameOrId === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
      const avatarSetting = await Setting.findOne({ key: "admin_avatar" });
      return {
        success: true,
        user: { id: "u_admin", username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD, role: "admin", name: "Admin User", email: process.env.ADMIN_USERNAME, avatar: avatarSetting?.value || "" }
      };
    }

    // Check against env HR credentials
    if (usernameOrId === process.env.HR_USERNAME && password === process.env.HR_PASSWORD) {
      const avatarSetting = await Setting.findOne({ key: "hr_avatar" });
      return {
        success: true,
        user: { id: "u_hr", username: process.env.HR_USERNAME, password: process.env.HR_PASSWORD, role: "hr", name: "HR Manager", email: process.env.HR_USERNAME, avatar: avatarSetting?.value || "" }
      };
    }

    // Check employees
    const emp = await Employee.findOne({ email: new RegExp(`^${usernameOrId}$`, "i"), password });
    if (emp) {
      await logLoginActivity(emp.id);
      return {
        success: true,
        user: { id: `u_${emp.id}`, username: emp.email, password: emp.password, role: "employee", employeeId: emp.id, name: emp.name, email: emp.email, avatar: emp.avatar || "" }
      };
    }

    return { success: false, error: "Invalid credentials" };
  } catch (error: any) {
    console.error("Login Action Error:", error);
    return { success: false, error: "Database connection or server error." };
  }
}

// ---------------- Employees ----------------
export async function getEmployees() {
  await connectDB();
  await Employee.updateMany({ department: "Application Point" }, { $set: { department: "Mobile App" } });
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
  const emp = await Employee.create({ ...data, id, avatar: data.avatar || "" });
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
    ...data, id, assignedBy: userId, status: "assigned", assignDate: data.assignDate || new Date().toISOString().slice(0, 10), comments: []
  });
  
  await createActivity({
    employeeId: data.assignedTo, actorId: userId, actorRole: userRole,
    activityType: "TASK_ASSIGNED", module: "TASK", referenceId: id,
    message: `Admin assigned you a new task: ${data.title}`
  });

  return serialize(task);
}

export async function updateTask(id: string, data: any, userId: string, userRole: string) {
  await connectDB();
  if (userRole !== "admin" && userRole !== "hr") throw new Error("Only Admin and HR can edit tasks");
  const task = await Task.findOneAndUpdate({ id }, data, { new: true }).lean();
  return serialize(task);
}

export async function updateTaskStatus(taskId: string, status: string, userId: string, userRole: string) {
  await connectDB();
  const task = await Task.findOne({ id: taskId });
  if (!task) throw new Error("Task not found");
  
  if (userRole === "employee" && task.assignedTo !== userId) throw new Error("Unauthorized");
  if (status === task.status) return serialize(task);

  if (status === "working_progress" && task.status === "assigned") {
    task.status = "working_progress";
    task.startedAt = new Date().toISOString();
    await createActivity({
      employeeId: task.assignedTo, actorId: userId, actorRole: userRole,
      activityType: "TASK_STARTED", module: "TASK", referenceId: taskId,
      message: `You started working on the task: ${task.title}`
    });
  } else if (status === "completed" && task.status === "working_progress") {
    task.status = "completed";
    task.completedAt = new Date().toISOString();
    await createActivity({
      employeeId: task.assignedTo, actorId: userId, actorRole: userRole,
      activityType: "TASK_COMPLETED", module: "TASK", referenceId: taskId,
      message: `You completed the task: ${task.title}`
    });
  } else {
    throw new Error(`Invalid status transition`);
  }

  await task.save();
  return serialize(task);
}

export async function reviewTask(taskId: string, review: { hrRating: string; hrReview: string }, userId: string, userRole: string) {
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

  await createActivity({
    employeeId: task.assignedTo, actorId: userId, actorRole: userRole,
    activityType: "TASK_REVIEWED", module: "TASK", referenceId: taskId,
    message: `HR reviewed your completed task: ${task.title}`,
    metadata: { rating: review.hrRating, feedback: review.hrReview }
  });

  return serialize(task);
}

export async function deleteTask(id: string, userId: string, userRole: string) {
  await connectDB();
  const task = await Task.findOne({ id });
  if (!task) throw new Error("Task not found");
  if (userRole === "employee" && task.assignedTo !== userId) throw new Error("Unauthorized");
  await Task.findOneAndDelete({ id });
  return { success: true };
}

export async function addComment(taskId: string, comment: { author: string; text: string }) {
  await connectDB();
  const task = await Task.findOneAndUpdate(
    { id: taskId }, { $push: { comments: { ...comment, time: new Date().toISOString() } } }, { new: true }
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
  const existingLeaves = await Leave.find({ employeeId: userId, status: { $in: ["pending", "hr_approved", "admin_approved"] } }).lean();
  const newStart = new Date(data.startDate).getTime();
  const newEnd = new Date(data.endDate).getTime();
  
  for (const l of existingLeaves) {
    const exStart = new Date((l as any).startDate).getTime();
    const exEnd = new Date((l as any).endDate).getTime();
    if (newStart <= exEnd && newEnd >= exStart) throw new Error("Overlapping leave request.");
  }

  const all = await Leave.find({}, { id: 1 }).lean();
  let max = 0;
  for (const doc of all) {
    const num = parseInt((doc as any).id.replace("LV", ""), 10);
    if (!isNaN(num) && num > max) max = num;
  }
  const id = `LV${String(max + 1).padStart(3, "0")}`;
  const days = Math.round((newEnd - newStart) / (1000 * 60 * 60 * 24)) + 1;
  
  const leave = await Leave.create({ ...data, id, employeeId: userId, numberOfDays: days, appliedAt: new Date().toISOString(), status: "pending" });
  
  await createActivity({
    employeeId: userId, actorId: userId, actorRole: "employee",
    activityType: "LEAVE_APPLIED", module: "LEAVE", referenceId: id,
    message: `Leave request submitted for ${days} day(s).`
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
  
  await createActivity({
    employeeId: userId, actorId: userId, actorRole: "employee",
    activityType: "LEAVE_CANCELLED", module: "LEAVE", referenceId: leaveId,
    message: `You cancelled your leave request.`
  });

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

  await createActivity({
    employeeId: leave.employeeId, actorId: hrId, actorRole: userRole,
    activityType: action === "approve" ? "LEAVE_HR_APPROVED" : "LEAVE_HR_REJECTED", module: "LEAVE", referenceId: leaveId,
    message: `Your leave request has been ${action === "approve" ? "approved" : "rejected"} by HR.`,
    metadata: { reason: comment }
  });

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

  await createActivity({
    employeeId: leave.employeeId, actorId: adminId, actorRole: userRole,
    activityType: action === "approve" ? "LEAVE_ADMIN_APPROVED" : "LEAVE_ADMIN_REJECTED", module: "LEAVE", referenceId: leaveId,
    message: `Your leave request has been finally ${action === "approve" ? "approved" : "rejected"} by Admin.`,
    metadata: { reason: comment }
  });

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
  const acts = await Activity.find({}).sort({ time: -1 }).lean();
  return serialize(acts);
}

async function logLoginActivity(employeeId: string) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5);
  
  let existing = await Attendance.findOne({ employeeId, date });
  if (!existing) {
    existing = new Attendance({ id: `${employeeId}-${date}`, employeeId, date, firstLoginAt: now, sessions: [], status: "Incomplete", productivity: 80, loginTime: time });
  }
  
  const activeSession = existing.sessions?.find((s: any) => !s.logoutAt);
  if (!activeSession) {
    existing.sessions.push({ loginAt: now });
    if (!existing.firstLoginAt) existing.firstLoginAt = now;
    existing.loginTime = time; 
    await existing.save();
    
    await createActivity({
      employeeId, actorId: employeeId, actorRole: "employee",
      activityType: "ATTENDANCE_LOGIN", module: "ATTENDANCE", referenceId: existing.id,
      message: "You logged in successfully."
    });
  }
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
      rec.workingHours = rec.totalWorkingHours; 
      rec.lastLogoutAt = now;
      rec.logoutTime = time; 
      
      if (rec.totalWorkingHours >= 8) rec.status = "Present";
      else if (rec.totalWorkingHours >= 4) rec.status = "Half Day";
      else if (rec.totalWorkingHours > 0) rec.status = "Short Day";
      else rec.status = "Incomplete";
      
      await rec.save();

      await createActivity({
        employeeId, actorId: employeeId, actorRole: "employee",
        activityType: "ATTENDANCE_LOGOUT", module: "ATTENDANCE", referenceId: rec.id,
        message: "You logged out successfully."
      });
    }
  }
  return { success: true };
}

export async function deleteAttendance(id: string, userRole: string) {
  await connectDB();
  if (userRole !== "admin") throw new Error("Only Admin can delete attendance records");
  await Attendance.findOneAndDelete({ id });
  return { success: true };
}

export async function updateSystemSetting(key: string, value: string) {
  await connectDB();
  const setting = await Setting.findOneAndUpdate(
    { key },
    { value },
    { new: true, upsert: true }
  ).lean();
  return serialize(setting);
}

export async function getSystemSettings() {
  await connectDB();
  const settings = await Setting.find({}).lean();
  return serialize(settings);
}

export async function updateSystemSettings(settings: Record<string, string>) {
  await connectDB();
  const promises = Object.entries(settings).map(([key, value]) =>
    Setting.findOneAndUpdate({ key }, { value }, { new: true, upsert: true }).lean()
  );
  await Promise.all(promises);
  return { success: true };
}
