import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import { Setting } from "@/models/Setting";

export async function GET() {
  try {
    await connectDB();
    const maintenanceSetting = await Setting.findOne({ key: "maintenance_mode" });
    const isMaintenanceMode = maintenanceSetting?.value === "true";
    
    return NextResponse.json({ 
      maintenanceMode: isMaintenanceMode 
    });
  } catch (error) {
    console.error("Error checking maintenance mode:", error);
    return NextResponse.json({ 
      maintenanceMode: false,
      error: "Failed to check maintenance mode"
    }, { status: 500 });
  }
}