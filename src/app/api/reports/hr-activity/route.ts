import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import { Activity } from "@/models/Activity";
import { Employee } from "@/models/Employee";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    // We fetch activities related to HR reviews (e.g. Leave Reviewed, Task Reviewed)
    // The existing system might not have explicit HR tracking yet, 
    // but assuming standard activity labels for now.
    const activities = await Activity.find({
      type: { $in: ["leave_review", "task_review", "hr_action"] }
    }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, data: activities });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
