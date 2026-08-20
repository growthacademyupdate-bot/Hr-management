import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import { Activity } from "@/models/Activity";

export async function GET(req: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  try {
    await connectDB();
    const resolvedParams = await params;
    
    const activities = await Activity.find({ employeeId: resolvedParams.employeeId }).sort({ time: -1 }).lean();
    return NextResponse.json({ success: true, data: activities });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
