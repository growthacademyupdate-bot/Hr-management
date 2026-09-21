import { NextResponse } from "next/server";

export function handleApiError(error: unknown, status = 500) {
  console.error("API Error:", error);
  const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
  return NextResponse.json({ success: false, error: errorMessage }, { status });
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
