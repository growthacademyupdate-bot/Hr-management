import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import { Leave } from "@/models/Leave";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const employeeId = searchParams.get("employeeId");
    
    const query: any = {};
    if (employeeId) query.employeeId = employeeId;
    
    const leaves = await Leave.find(query).sort({ appliedAt: -1 }).lean();
    return NextResponse.json({ success: true, data: leaves });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
