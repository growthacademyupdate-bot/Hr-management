import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import { Attendance } from "@/models/Attendance";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const employeeId = searchParams.get("employeeId");
    
    if (!employeeId) {
      return NextResponse.json({ success: false, error: "employeeId is required" }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const record = await Attendance.findOne({ employeeId, date: today }).lean();
    
    return NextResponse.json({ success: true, data: record || null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
