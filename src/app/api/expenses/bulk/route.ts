import { NextRequest } from "next/server";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { addBulkExpenses } from "@/app/actions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bills, authorId } = body;
    if (!bills || !Array.isArray(bills) || bills.length === 0) {
      return handleApiError(new Error("No bills provided for bulk upload"));
    }
    const result = await addBulkExpenses(bills, authorId || "u_employee");
    return apiSuccess(result);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
