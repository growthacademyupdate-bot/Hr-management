"use server";

import connectDB from "@/lib/mongoose";
import { Employee } from "@/models/Employee";
import { Task } from "@/models/Task";
import { Leave } from "@/models/Leave";
import { Attendance } from "@/models/Attendance";
import { Activity } from "@/models/Activity";
import { Setting } from "@/models/Setting";
import { Holiday } from "@/models/Holiday";
import { Notification } from "@/models/Notification";
import { Expense } from "@/models/Expense";

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

export async function createNotification(data: {
  recipientId: string;
  recipientRole?: string;
  senderId?: string;
  senderRole?: string;
  title: string;
  message: string;
  type: string;
  module: string;
  referenceId?: string;
  actionUrl?: string;
  metadata?: any;
}) {
  await connectDB();
  await Notification.create({
    id: `NOT${Date.now()}${Math.floor(Math.random() * 1000)}`,
    ...data
  });
}

export async function broadcastNotification(data: {
  title: string;
  message: string;
  senderId: string;
  senderRole: string;
}) {
  await connectDB();
  const employees = await Employee.find({ status: "Active" }, { id: 1 }).lean();
  const broadcastId = `BCAST${Date.now()}`;
  
  const bulkNotifications = employees.map((emp: any) => ({
    id: `NOT${Date.now()}${Math.floor(Math.random() * 1000)}${emp.id}`,
    recipientId: emp.id,
    senderId: data.senderId,
    senderRole: data.senderRole,
    title: data.title,
    message: data.message,
    type: "SYSTEM_NOTIFICATION",
    module: "SYSTEM",
    referenceId: broadcastId
  }));

  // Also notify HR if the sender isn't HR
  if (data.senderRole !== "hr") {
    bulkNotifications.push({
      id: `NOT${Date.now()}${Math.floor(Math.random() * 1000)}hr`,
      recipientId: "u_hr",
      senderId: data.senderId,
      senderRole: data.senderRole,
      title: data.title,
      message: data.message,
      type: "SYSTEM_NOTIFICATION",
      module: "SYSTEM",
      referenceId: broadcastId
    });
  }

  await Notification.insertMany(bulkNotifications);
  return { success: true, broadcastId };
}

export async function editBroadcastNotification(broadcastId: string, data: { title: string, message: string }) {
  await connectDB();
  await Notification.updateMany(
    { referenceId: broadcastId, module: "SYSTEM" },
    { $set: { title: data.title, message: data.message } }
  );
  return { success: true };
}

export async function deleteBroadcastNotification(broadcastId: string) {
  await connectDB();
  await Notification.deleteMany({ referenceId: broadcastId, module: "SYSTEM" });
  return { success: true };
}

export async function getSentBroadcasts(userId: string) {
  await connectDB();
  // Fetch one notification per broadcastId where senderId matches
  const broadcasts = await Notification.aggregate([
    { $match: { senderId: userId, module: "SYSTEM" } },
    { $group: { _id: "$referenceId", doc: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$doc" } },
    { $sort: { createdAt: -1 } }
  ]);
  
  // Map _id back to string to prevent hydration errors and ensure referenceId exists
  const mapped = broadcasts.map(b => ({
    ...b,
    _id: b._id.toString(),
    referenceId: b.referenceId
  }));
  return serialize(mapped);
}

export async function getNotifications(userId: string) {
  await connectDB();
  const notifs = await Notification.find({ recipientId: userId }).sort({ createdAt: -1 }).limit(100).lean();
  return serialize(notifs);
}

export async function markNotificationAsRead(id: string, userId: string) {
  await connectDB();
  const notif = await Notification.findOneAndUpdate({ id, recipientId: userId }, { isRead: true, readAt: new Date().toISOString() }, { new: true }).lean();
  return serialize(notif);
}

export async function markAllNotificationsAsRead(userId: string) {
  await connectDB();
  await Notification.updateMany({ recipientId: userId, isRead: false }, { isRead: true, readAt: new Date().toISOString() });
  return { success: true };
}

export async function deleteNotification(notificationId: string, userId: string, userRole: string) {
  await connectDB();
  console.log("deleteNotification called with:", { notificationId, userId, userRole });
  const notification = await Notification.findOne({ id: notificationId });
  if (!notification) throw new Error("Notification not found");
  if (userRole === "employee" && notification.recipientId !== userId) throw new Error("Unauthorized");
  // Admin and HR can delete any notification
  
  await Notification.findOneAndDelete({ id: notificationId });
  return { success: true };
}

export async function loginAction(usernameOrId: string, password: string) {
  try {
    await connectDB();
    
    // Check maintenance mode
    const maintenanceSetting = await Setting.findOne({ key: "maintenance_mode" });
    const isMaintenanceMode = maintenanceSetting?.value === "true";
    
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
  
  if (data.avatar && typeof data.avatar === 'string' && data.avatar.startsWith("data:image")) {
    const result = await uploadImageToCloudinary(data.avatar);
    if (result.success) data.avatar = result.url;
  }
  
  const emp = await Employee.create({ 
    designation: "Staff",
    mobile: "Not Provided",
    department: "General",
    joiningDate: new Date().toISOString().slice(0, 10),
    salary: 0,
    password: "password123",
    ...data, 
    id, 
    avatar: data.avatar || "" 
  });
  return serialize(emp);
}

export async function updateEmployee(id: string, data: any) {
  await connectDB();
  if (data.avatar && typeof data.avatar === 'string' && data.avatar.startsWith("data:image")) {
    const result = await uploadImageToCloudinary(data.avatar);
    if (result.success) data.avatar = result.url;
  }
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

  await createNotification({
    recipientId: data.assignedTo,
    senderId: userId,
    senderRole: userRole,
    title: "New Task Assigned",
    message: `You have been assigned a new task: ${data.title}`,
    type: "TASK_ASSIGNED",
    module: "TASK",
    referenceId: id,
    actionUrl: `/tasks`,
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
  } else if (status === "completed" && (task.status === "working_progress" || task.status === "assigned")) {
    task.status = "completed";
    task.completedAt = new Date().toISOString();
    if (!task.startedAt) {
      task.startedAt = new Date().toISOString();
    }
    await createActivity({
      employeeId: task.assignedTo, actorId: userId, actorRole: userRole,
      activityType: "TASK_COMPLETED", module: "TASK", referenceId: taskId,
      message: `You completed the task: ${task.title}`
    });
    
    // Notify Admin (assigner)
    await createNotification({
      recipientId: task.assignedBy || "u_admin",
      senderId: userId,
      senderRole: userRole,
      title: "Task Completed",
      message: `Employee completed the task: ${task.title}. Review required.`,
      type: "TASK_COMPLETED",
      module: "TASK",
      referenceId: taskId,
      actionUrl: `/tasks`,
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

  await createNotification({
    recipientId: task.assignedTo,
    senderId: userId,
    senderRole: userRole,
    title: "Task Reviewed",
    message: `Your task '${task.title}' has received a rating of ${review.hrRating}/5.`,
    type: "TASK_REVIEWED",
    module: "TASK",
    referenceId: taskId,
    actionUrl: `/tasks`,
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
  
  const normalizeDateStr = (d: string) => {
    if (!d) return "";
    if (d.includes("T")) return d.split("T")[0];
    return d.slice(0, 10);
  };

  const reqStart = normalizeDateStr(data.startDate);
  const reqEnd = normalizeDateStr(data.endDate);

  if (!reqStart || !reqEnd) throw new Error("Please select valid Start and End dates.");
  if (reqEnd < reqStart) throw new Error("End date cannot be before start date.");

  const existingLeaves = await Leave.find({ 
    employeeId: userId, 
    status: { $in: ["pending", "hr_approved", "admin_approved"] } 
  }).lean();
  
  for (const l of existingLeaves) {
    const exStart = normalizeDateStr((l as any).startDate);
    const exEnd = normalizeDateStr((l as any).endDate);
    if (reqStart <= exEnd && reqEnd >= exStart) {
      throw new Error(`You already have an active leave request from ${exStart} to ${exEnd}.`);
    }
  }

  const all = await Leave.find({}, { id: 1 }).lean();
  let max = 0;
  for (const doc of all) {
    const num = parseInt((doc as any).id.replace("LV", ""), 10);
    if (!isNaN(num) && num > max) max = num;
  }
  const id = `LV${String(max + 1).padStart(3, "0")}`;
  
  const sDate = new Date(reqStart);
  const eDate = new Date(reqEnd);
  let days = Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Find overlapping company holidays and subtract them
  const holidays = await Holiday.find({
    isActive: true,
    holidayType: "COMPANY_HOLIDAY",
    $or: [
      { startDate: { $lte: reqEnd }, endDate: { $gte: reqStart } }
    ]
  }).lean();

  let holidayDates = new Set<string>();
  for (const h of holidays) {
    let curr = new Date(normalizeDateStr((h as any).startDate));
    const endHol = new Date(normalizeDateStr((h as any).endDate));
    while (curr <= endHol) {
      const currStr = curr.toISOString().slice(0, 10);
      if (currStr >= reqStart && currStr <= reqEnd) {
        holidayDates.add(currStr);
      }
      curr.setDate(curr.getDate() + 1);
    }
  }
  
  days = Math.max(0, days - holidayDates.size);
  if (days <= 0) throw new Error("Selected date range consists entirely of company holidays.");

  const empDoc = await Employee.findOne({ id: userId }, { name: 1 }).lean();
  const empName = (empDoc as any)?.name || "An employee";
  const notifMsg = `${empName} requested ${days} day(s) of leave (${data.type || "Leave"}).`;

  const leave = await Leave.create({ ...data, id, employeeId: userId, numberOfDays: days, appliedAt: new Date().toISOString(), status: "pending" });
  
  await createActivity({
    employeeId: userId, actorId: userId, actorRole: "employee",
    activityType: "LEAVE_APPLIED", module: "LEAVE", referenceId: id,
    message: `Leave request submitted for ${days} day(s).`
  });

  // Notify HR
  await createNotification({
    recipientId: "u_hr",
    senderId: userId,
    senderRole: "employee",
    title: "New Leave Request",
    message: notifMsg,
    type: "LEAVE_APPLIED",
    module: "LEAVE",
    referenceId: id,
    actionUrl: `/leaves`,
  });

  // Notify Admin
  await createNotification({
    recipientId: "u_admin",
    senderId: userId,
    senderRole: "employee",
    title: "New Leave Request",
    message: notifMsg,
    type: "LEAVE_APPLIED",
    module: "LEAVE",
    referenceId: id,
    actionUrl: `/leaves`,
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
  
  const empDoc = await Employee.findOne({ id: userId }, { name: 1 }).lean();
  const empName = (empDoc as any)?.name || "An employee";

  await createActivity({
    employeeId: userId, actorId: userId, actorRole: "employee",
    activityType: "LEAVE_CANCELLED", module: "LEAVE", referenceId: leaveId,
    message: `You cancelled your leave request.`
  });

  // Notify managers about cancellation
  const cancelMsg = `${empName} cancelled their leave request.`;
  await createNotification({
    recipientId: "u_hr", senderId: userId, senderRole: "employee",
    title: "Leave Request Cancelled", message: cancelMsg, type: "LEAVE_CANCELLED", module: "LEAVE", referenceId: leaveId, actionUrl: `/leaves`
  });
  await createNotification({
    recipientId: "u_admin", senderId: userId, senderRole: "employee",
    title: "Leave Request Cancelled", message: cancelMsg, type: "LEAVE_CANCELLED", module: "LEAVE", referenceId: leaveId, actionUrl: `/leaves`
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

  await createNotification({
    recipientId: leave.employeeId,
    senderId: hrId,
    senderRole: userRole,
    title: `Leave ${action === "approve" ? "Approved" : "Rejected"} by HR`,
    message: `Your leave request has been ${action === "approve" ? "approved" : "rejected"} by HR.`,
    type: action === "approve" ? "LEAVE_HR_APPROVED" : "LEAVE_HR_REJECTED",
    module: "LEAVE",
    referenceId: leaveId,
    actionUrl: `/leaves`,
  });

  if (action === "approve") {
    await createNotification({
      recipientId: "u_admin",
      senderId: hrId,
      senderRole: userRole,
      title: "Leave Requires Final Approval",
      message: `HR approved a leave request. Final Admin approval is required.`,
      type: "LEAVE_HR_APPROVED",
      module: "LEAVE",
      referenceId: leaveId,
      actionUrl: `/leaves`,
    });
  }

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

  await createNotification({
    recipientId: leave.employeeId,
    senderId: adminId,
    senderRole: userRole,
    title: `Leave ${action === "approve" ? "Approved" : "Rejected"} by Admin`,
    message: `Your leave request has been finally ${action === "approve" ? "approved" : "rejected"} by Admin.`,
    type: action === "approve" ? "LEAVE_ADMIN_APPROVED" : "LEAVE_ADMIN_REJECTED",
    module: "LEAVE",
    referenceId: leaveId,
    actionUrl: `/leaves`,
  });

  return serialize(leave);
}

export async function deleteLeave(leaveId: string, userId: string, userRole: string) {
  await connectDB();
  console.log("deleteLeave called with:", { leaveId, userId, userRole });
  const leave = await Leave.findOne({ id: leaveId });
  if (!leave) throw new Error("Leave not found");
  if (userRole === "employee" && leave.employeeId !== userId) throw new Error("Unauthorized");
  // Admin and HR can delete any leave (no additional checks needed)
  
  await Leave.findOneAndDelete({ id: leaveId });

  await createActivity({
    employeeId: leave.employeeId, actorId: userId, actorRole: userRole,
    activityType: "LEAVE_DELETED", module: "LEAVE", referenceId: leaveId,
    message: `Leave request was deleted.`
  });

  return { success: true };
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

export async function deleteActivity(activityId: string, userRole: string) {
  await connectDB();
  if (userRole !== "admin") throw new Error("Only Admin can delete activity records");
  await Activity.findOneAndDelete({ id: activityId });
  return { success: true };
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

// ---------------- Holidays ----------------

export async function getHolidays() {
  await connectDB();
  const holidays = await Holiday.find({}).sort({ startDate: 1 }).lean();
  return serialize(holidays);
}

export async function createHoliday(data: any, adminId: string, userRole: string) {
  await connectDB();
  if (userRole !== "admin") throw new Error("Unauthorized: Only Admin can create holidays");

  // Validate dates
  if (new Date(data.endDate) < new Date(data.startDate)) {
    throw new Error("End date cannot be before start date");
  }

  const holiday = await Holiday.create({
    ...data,
    id: `HOL-${Date.now()}`,
    createdBy: adminId
  });

  await createActivity({
    employeeId: adminId, actorId: adminId, actorRole: userRole,
    activityType: "HOLIDAY_CREATED", module: "HOLIDAY", referenceId: holiday.id,
    message: `Admin created a new holiday: ${holiday.name}.`,
    metadata: { holidayId: holiday.id }
  });

  // Bulk Notification to all employees and HR
  const employees = await Employee.find({ status: "Active" }, { id: 1 }).lean();
  const bulkNotifications = employees.map((emp: any) => ({
    id: `NOT${Date.now()}${Math.floor(Math.random() * 1000)}${emp.id}`,
    recipientId: emp.id,
    senderId: adminId,
    senderRole: userRole,
    title: "New Holiday Added",
    message: `New holiday added: ${holiday.name} - ${new Date(holiday.startDate).toLocaleDateString()}`,
    type: "HOLIDAY_CREATED",
    module: "HOLIDAY",
    referenceId: holiday.id,
    actionUrl: `/holidays`,
  }));
  
  // Add HR to the bulk notification
  bulkNotifications.push({
    id: `NOT${Date.now()}${Math.floor(Math.random() * 1000)}hr`,
    recipientId: "u_hr",
    senderId: adminId,
    senderRole: userRole,
    title: "New Holiday Added",
    message: `New holiday added: ${holiday.name} - ${new Date(holiday.startDate).toLocaleDateString()}`,
    type: "HOLIDAY_CREATED",
    module: "HOLIDAY",
    referenceId: holiday.id,
    actionUrl: `/holidays`,
  });

  await Notification.insertMany(bulkNotifications);

  return serialize(holiday);
}

export async function updateHoliday(id: string, data: any, adminId: string, userRole: string) {
  await connectDB();
  if (userRole !== "admin") throw new Error("Unauthorized: Only Admin can update holidays");

  // Validate dates
  if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
    throw new Error("End date cannot be before start date");
  }

  const holiday = await Holiday.findOneAndUpdate(
    { id },
    { ...data, updatedBy: adminId },
    { new: true }
  ).lean();
  
  if (!holiday) throw new Error("Holiday not found");

  await createActivity({
    employeeId: adminId, actorId: adminId, actorRole: userRole,
    activityType: "HOLIDAY_UPDATED", module: "HOLIDAY", referenceId: id,
    message: `Admin updated the holiday: ${holiday.name}.`,
    metadata: { holidayId: id }
  });

  return serialize(holiday);
}

export async function deleteHoliday(id: string, adminId: string, userRole: string) {
  await connectDB();
  if (userRole !== "admin") throw new Error("Unauthorized: Only Admin can delete holidays");

  const holiday = await Holiday.findOne({ id });
  if (!holiday) throw new Error("Holiday not found");

  await Holiday.findOneAndDelete({ id });

  await createActivity({
    employeeId: adminId, actorId: adminId, actorRole: userRole,
    activityType: "HOLIDAY_DELETED", module: "HOLIDAY", referenceId: id,
    message: `Admin deleted the holiday: ${holiday.name}.`,
    metadata: { holidayId: id }
  });

  return { success: true };
}

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImageToCloudinary(base64Image: string) {
  try {
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: "ems_avatars",
    });
    return { success: true, url: result.secure_url };
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    return { success: false, error: "Failed to upload to Cloudinary" };
  }
}

// ---------------- Expenses ----------------

export async function getExpenses(userRole?: string, userId?: string) {
  await connectDB();
  if (userRole === "employee" && userId) {
    const expenses = await Expense.find({ employeeId: userId }).sort({ createdAt: -1 }).lean();
    return serialize(expenses);
  }
  const expenses = await Expense.find({}).sort({ createdAt: -1 }).lean();
  return serialize(expenses);
}

export async function addExpense(data: any, userId: string) {
  await connectDB();
  const all = await Expense.find({}, { id: 1 }).lean();
  let max = 0;
  for (const doc of all) {
    const num = parseInt((doc as any).id.replace("EXP", ""), 10);
    if (!isNaN(num) && num > max) max = num;
  }
  const id = `EXP${String(max + 1).padStart(3, "0")}`;

  let receiptUrl = data.receiptUrl || null;
  if (receiptUrl && typeof receiptUrl === "string" && receiptUrl.startsWith("data:image")) {
    const uploadRes = await uploadImageToCloudinary(receiptUrl);
    if (uploadRes.success) receiptUrl = uploadRes.url;
  }

  const expense = await Expense.create({
    ...data,
    id,
    employeeId: userId,
    receiptUrl,
    amount: Number(data.amount),
    appliedAt: new Date().toISOString(),
    status: "pending"
  });

  await createActivity({
    employeeId: userId, actorId: userId, actorRole: "employee",
    activityType: "EXPENSE_SUBMITTED", module: "EXPENSE", referenceId: id,
    message: `Expense claim submitted for ₹${data.amount} (${data.category}).`
  });

  const empDoc = await Employee.findOne({ id: userId }, { name: 1 }).lean();
  const empName = (empDoc as any)?.name || "An employee";
  const expMsg = `${empName} submitted an expense claim of ₹${data.amount} (${data.category}).`;

  await createNotification({
    recipientId: "u_hr",
    senderId: userId,
    senderRole: "employee",
    title: "New Expense Claim",
    message: expMsg,
    type: "EXPENSE_SUBMITTED",
    module: "EXPENSE",
    referenceId: id,
    actionUrl: `/expenses`,
  });

  await createNotification({
    recipientId: "u_admin",
    senderId: userId,
    senderRole: "employee",
    title: "New Expense Claim",
    message: expMsg,
    type: "EXPENSE_SUBMITTED",
    module: "EXPENSE",
    referenceId: id,
    actionUrl: `/expenses`,
  });

  return serialize(expense);
}

export async function cancelExpense(expenseId: string, userId: string) {
  await connectDB();
  const expense = await Expense.findOne({ id: expenseId });
  if (!expense) throw new Error("Expense claim not found");
  if (expense.employeeId !== userId) throw new Error("Unauthorized");
  if (expense.status !== "pending") throw new Error("Can only cancel pending expense claims");

  expense.status = "cancelled";
  expense.cancelledBy = userId;
  expense.cancelledAt = new Date().toISOString();
  await expense.save();

  await createActivity({
    employeeId: userId, actorId: userId, actorRole: "employee",
    activityType: "EXPENSE_CANCELLED", module: "EXPENSE", referenceId: expenseId,
    message: `You cancelled your expense claim for ₹${expense.amount}.`
  });

  return serialize(expense);
}

export async function hrReviewExpense(expenseId: string, action: "approve" | "reject", comment: string, hrId: string, userRole: string) {
  await connectDB();
  if (userRole !== "hr" && userRole !== "admin") throw new Error("Unauthorized");
  const expense = await Expense.findOne({ id: expenseId });
  if (!expense) throw new Error("Expense claim not found");
  if (expense.status !== "pending") throw new Error("Expense claim is not pending HR review");

  expense.status = action === "approve" ? "hr_approved" : "hr_rejected";
  expense.hrReviewedBy = hrId;
  expense.hrReviewedAt = new Date().toISOString();
  expense.hrReviewComment = comment || null;
  await expense.save();

  await createActivity({
    employeeId: expense.employeeId, actorId: hrId, actorRole: userRole,
    activityType: action === "approve" ? "EXPENSE_HR_APPROVED" : "EXPENSE_HR_REJECTED", module: "EXPENSE", referenceId: expenseId,
    message: `Your expense claim of ₹${expense.amount} has been ${action === "approve" ? "approved" : "rejected"} by HR.`,
    metadata: { reason: comment }
  });

  await createNotification({
    recipientId: expense.employeeId,
    senderId: hrId,
    senderRole: userRole,
    title: `Expense Claim ${action === "approve" ? "Approved" : "Rejected"} by HR`,
    message: `Your expense claim for ₹${expense.amount} was ${action === "approve" ? "approved" : "rejected"} by HR.`,
    type: action === "approve" ? "EXPENSE_HR_APPROVED" : "EXPENSE_HR_REJECTED",
    module: "EXPENSE",
    referenceId: expenseId,
    actionUrl: `/expenses`,
  });

  if (action === "approve") {
    await createNotification({
      recipientId: "u_admin",
      senderId: hrId,
      senderRole: userRole,
      title: "Expense Requires Final Approval",
      message: `HR approved an expense claim of ₹${expense.amount}. Final Admin approval required.`,
      type: "EXPENSE_HR_APPROVED",
      module: "EXPENSE",
      referenceId: expenseId,
      actionUrl: `/expenses`,
    });
  }

  return serialize(expense);
}

export async function adminReviewExpense(expenseId: string, action: "approve" | "reject", comment: string, adminId: string, userRole: string) {
  await connectDB();
  if (userRole !== "admin") throw new Error("Unauthorized");
  const expense = await Expense.findOne({ id: expenseId });
  if (!expense) throw new Error("Expense claim not found");
  if (expense.status !== "hr_approved" && expense.status !== "pending") throw new Error("Invalid expense review state");

  expense.status = action === "approve" ? "admin_approved" : "admin_rejected";
  expense.adminReviewedBy = adminId;
  expense.adminReviewedAt = new Date().toISOString();
  expense.adminReviewComment = comment || null;
  await expense.save();

  await createActivity({
    employeeId: expense.employeeId, actorId: adminId, actorRole: userRole,
    activityType: action === "approve" ? "EXPENSE_ADMIN_APPROVED" : "EXPENSE_ADMIN_REJECTED", module: "EXPENSE", referenceId: expenseId,
    message: `Your expense claim of ₹${expense.amount} has been finally ${action === "approve" ? "approved" : "rejected"} by Admin.`,
    metadata: { reason: comment }
  });

  await createNotification({
    recipientId: expense.employeeId,
    senderId: adminId,
    senderRole: userRole,
    title: `Expense Claim ${action === "approve" ? "Approved" : "Rejected"} by Admin`,
    message: `Your expense claim for ₹${expense.amount} was ${action === "approve" ? "approved" : "rejected"} by Admin.`,
    type: action === "approve" ? "EXPENSE_ADMIN_APPROVED" : "EXPENSE_ADMIN_REJECTED",
    module: "EXPENSE",
    referenceId: expenseId,
    actionUrl: `/expenses`,
  });

  return serialize(expense);
}

export async function markExpenseReimbursed(expenseId: string, reviewerId: string, userRole: string) {
  await connectDB();
  if (userRole !== "admin" && userRole !== "hr") throw new Error("Unauthorized");
  const expense = await Expense.findOne({ id: expenseId });
  if (!expense) throw new Error("Expense claim not found");
  if (expense.status !== "admin_approved" && expense.status !== "hr_approved") throw new Error("Only approved expenses can be marked as reimbursed");

  expense.status = "reimbursed";
  expense.reimbursedBy = reviewerId;
  expense.reimbursedAt = new Date().toISOString();
  await expense.save();

  await createActivity({
    employeeId: expense.employeeId, actorId: reviewerId, actorRole: userRole,
    activityType: "EXPENSE_REIMBURSED", module: "EXPENSE", referenceId: expenseId,
    message: `Your expense claim of ₹${expense.amount} has been marked as Reimbursed (Paid).`
  });

  await createNotification({
    recipientId: expense.employeeId,
    senderId: reviewerId,
    senderRole: userRole,
    title: "Expense Reimbursed",
    message: `Your expense claim of ₹${expense.amount} (${expense.category}) has been reimbursed.`,
    type: "EXPENSE_REIMBURSED",
    module: "EXPENSE",
    referenceId: expenseId,
    actionUrl: `/expenses`,
  });

  return serialize(expense);
}

export async function deleteExpense(id: string, userRole: string) {
  await connectDB();
  if (userRole !== "admin") throw new Error("Only Admin can delete expense records");
  await Expense.findOneAndDelete({ id });
  return { success: true };
}

