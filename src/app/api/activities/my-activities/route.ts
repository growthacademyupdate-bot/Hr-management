import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import { Activity } from "@/models/Activity";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const employeeId = searchParams.get("employeeId"); // Required

    if (!employeeId) {
      return NextResponse.json({ success: false, error: "employeeId is required" }, { status: 400 });
    }
    
    const module = searchParams.get("module");
    const activityType = searchParams.get("activityType");
    
    const query: any = { employeeId };
    if (module) query.module = module;
    if (activityType) query.type = activityType;

    const activities = await Activity.find(query).sort({ time: -1 }).lean();
    return NextResponse.json({ success: true, data: activities });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
