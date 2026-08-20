import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import { Employee } from "@/models/Employee";
import { Task } from "@/models/Task";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const employeeId = searchParams.get("employeeId");

    const query: any = {};
    if (employeeId) query.id = employeeId;

    const employees = await Employee.find(query).lean();
    const allTasks = await Task.find().lean();

    const performanceData = employees.map(emp => {
      const myTasks = allTasks.filter(t => t.assignedTo === emp.id);
      const completed = myTasks.filter(t => t.status === "completed" || t.status === "reviewed").length;
      
      let totalRating = 0;
      let ratedCount = 0;
      myTasks.forEach(t => {
        if (t.hrRating) {
          const ratingVal = parseInt(t.hrRating.split("/")[0]) || 0;
          if (ratingVal > 0) {
            totalRating += ratingVal;
            ratedCount++;
          }
        }
      });

      const avgRating = ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : "N/A";
      const completionRate = myTasks.length > 0 ? Math.round((completed / myTasks.length) * 100) : 0;

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        totalTasks: myTasks.length,
        completedTasks: completed,
        completionRate,
        averageHrRating: avgRating
      };
    });

    return NextResponse.json({ success: true, data: performanceData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
