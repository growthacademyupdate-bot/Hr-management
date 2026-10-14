import { NextRequest, NextResponse } from "next/server";
import { validateSalesLogoutStatus } from "@/app/actions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { employeeId, role } = body;

    const result = await validateSalesLogoutStatus(employeeId, role);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("API validate-logout error:", error);
    return NextResponse.json(
      { allowed: false, error: "Validation server error" },
      { status: 500 }
    );
  }
}
