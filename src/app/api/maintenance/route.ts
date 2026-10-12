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

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const enabled = body.enabled === true || body.enabled === "true";
    
    await Setting.findOneAndUpdate(
      { key: "maintenance_mode" },
      { value: enabled ? "true" : "false" },
      { upsert: true, new: true }
    );
    
    return NextResponse.json({ 
      success: true, 
      maintenanceMode: enabled 
    });
  } catch (error) {
    console.error("Error updating maintenance mode:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to update maintenance mode" 
    }, { status: 500 });
  }
}