import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import { Attendance } from "@/models/Attendance";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const resolvedParams = await params;
    const record = await Attendance.findOne({ id: resolvedParams.id }).lean();
    if (!record) {
      return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
