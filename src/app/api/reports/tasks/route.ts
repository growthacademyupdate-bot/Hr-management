import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import { Task } from "@/models/Task";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const assignedTo = searchParams.get("assignedTo");
    
    const query: any = {};
    if (assignedTo) query.assignedTo = assignedTo;
    
    const tasks = await Task.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
