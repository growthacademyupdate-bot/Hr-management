import { NextRequest } from "next/server";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import connectDB from "@/lib/mongoose";
import { Attendance } from "@/models/Attendance";
import { Employee } from "@/models/Employee";

interface AttendanceQuery {
  employeeId?: string;
  status?: string;
  date?: {
    $gte?: string;
    $lte?: string;
  };
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    const query: AttendanceQuery = {};
    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = fromDate;
      if (toDate) query.date.$lte = toDate;
    }

    const records = await Attendance.find(query).sort({ createdAt: -1 }).lean();
    return apiSuccess(records);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
