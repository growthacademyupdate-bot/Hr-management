import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import { Employee } from "@/models/Employee";
import { Attendance } from "@/models/Attendance";
import { Task } from "@/models/Task";
import { Leave } from "@/models/Leave";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const totalEmployees = await Employee.countDocuments();
    const activeEmployees = await Employee.countDocuments({ status: "Active" });
    
    const today = new Date().toISOString().slice(0, 10);
    const attendances = await Attendance.find({ date: today }).lean();
    
    const presentCount = attendances.filter(a => a.status === "Present").length;
    const halfDayCount = attendances.filter(a => a.status === "Half Day").length;
    const shortDayCount = attendances.filter(a => a.status === "Short Day").length;
    const activeSessionCount = attendances.filter(a => a.sessions?.some((s: any) => !s.logoutAt)).length;
    
    const leaves = await Leave.find().lean();
    const pendingLeaves = leaves.filter(l => l.status === "pending").length;
    const approvedLeaves = leaves.filter(l => l.status === "admin_approved").length;
    
    const tasks = await Task.find().lean();
    const completedTasks = tasks.filter(t => t.status === "completed" || t.status === "reviewed").length;
    const overdueTasks = tasks.filter(t => new Date(t.dueDate) < new Date() && !["completed", "reviewed"].includes(t.status)).length;
    
    return NextResponse.json({
      success: true,
      data: {
        employees: { total: totalEmployees, active: activeEmployees },
        attendance: { present: presentCount, halfDay: halfDayCount, shortDay: shortDayCount, currentlyWorking: activeSessionCount },
        leaves: { pending: pendingLeaves, approved: approvedLeaves },
        tasks: { total: tasks.length, completed: completedTasks, overdue: overdueTasks }
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
