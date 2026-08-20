import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import { Attendance } from "@/models/Attendance";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const employeeId = searchParams.get("employeeId");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    
    if (!employeeId) {
      return NextResponse.json({ success: false, error: "employeeId is required" }, { status: 400 });
    }

    const query: any = { employeeId };
    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = fromDate;
      if (toDate) query.date.$lte = toDate;
    }

    const records = await Attendance.find(query).sort({ date: -1 }).lean();
    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
