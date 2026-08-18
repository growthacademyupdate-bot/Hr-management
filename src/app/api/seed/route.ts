import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import { Employee } from "@/models/Employee";
import { Task } from "@/models/Task";
import { Leave } from "@/models/Leave";
import { Attendance } from "@/models/Attendance";
import { Activity } from "@/models/Activity";

const DEPARTMENTS = ["Design", "Marketing", "Sales", "HR", "Web", "Finance", "Operations"];
const FIRST = ["Aarav","Vivaan","Aditya","Priya","Ananya","Diya","Sara","Riya"];
const LAST = ["Sharma","Verma","Patel","Gupta","Smith","Johnson","Brown","Davis"];

function rand(arr: any[]) { return arr[Math.floor(Math.random() * arr.length)]; }
function pad(n: number) { return String(n).padStart(3, "0"); }

export async function GET() {
  try {
    await connectDB();
    
    // Clear existing
    await Employee.deleteMany({});
    await Task.deleteMany({});
    await Leave.deleteMany({});
    await Attendance.deleteMany({});
    await Activity.deleteMany({});

    const emps = [];
    for (let i = 1; i <= 10; i++) {
      const id = `EMP${pad(i)}`;
      const name = `${rand(FIRST)} ${rand(LAST)}`;
      const email = i === 1 ? "employee@example.com" : `${name.toLowerCase().replace(" ", ".")}@workmonitor.com`;
      const emp = await Employee.create({
        id,
        name,
        email,
        mobile: `+91 98765432${i}`,
        department: rand(DEPARTMENTS),
        designation: "Staff",
        joiningDate: "2023-01-15",
        salary: 60000,
        status: "Active",
        avatar: `https://i.pravatar.cc/120?u=${id}`,
        password: "emp123" // Explicitly setting this password so demo login works
      });
      emps.push(emp);
    }

    for (let i = 1; i <= 20; i++) {
      await Task.create({
        id: `TASK${pad(i)}`,
        title: `Task ${i}`,
        description: "Complete this task soon.",
        assignedTo: rand(emps).id,
        priority: "Medium",
        dueDate: "2026-12-31",
        status: rand(["Pending", "In Progress", "Completed"]),
        progress: 50,
        createdAt: new Date().toISOString()
      });
    }
    
    return NextResponse.json({ success: true, message: "Database seeded successfully!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
