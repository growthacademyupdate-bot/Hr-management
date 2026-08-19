import mongoose from "mongoose";
import dotenv from "dotenv";
import { Employee } from "../src/models/Employee.js";
import { Task } from "../src/models/Task.js";
import { Leave } from "../src/models/Leave.js";
import { Attendance } from "../src/models/Attendance.js";
import { Activity } from "../src/models/Activity.js";

// We'll just copy the simple mock generators here to keep it self-contained
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) throw new Error("Missing MONGO_URI");

const DEPARTMENTS = ["Design", "Marketing", "Sales", "HR", "Web", "Finance", "Operations"];
const FIRST = ["Aarav","Vivaan","Aditya","Priya","Ananya","Diya","Sara","Riya"];
const LAST = ["Sharma","Verma","Patel","Gupta","Smith","Johnson","Brown","Davis"];

function rand(arr: any[]) { return arr[Math.floor(Math.random() * arr.length)]; }
function pad(n: number) { return String(n).padStart(3, "0"); }

async function seed() {
  await mongoose.connect(MONGO_URI!);
  console.log("Connected to DB, clearing existing data...");
  
  await Employee.deleteMany({});
  await Task.deleteMany({});
  await Leave.deleteMany({});
  await Attendance.deleteMany({});
  await Activity.deleteMany({});

  console.log("Seeding employees...");
  const emps = [];
  for (let i = 1; i <= 10; i++) {
    const id = `EMP${pad(i)}`;
    const name = `${rand(FIRST)} ${rand(LAST)}`;
    const emp = await Employee.create({
      id,
      name,
      email: `${name.toLowerCase().replace(" ", ".")}@workmonitor.com`,
      mobile: `+91 98765432${i}`,
      department: rand(DEPARTMENTS),
      designation: "Staff",
      joiningDate: "2023-01-15",
      salary: 60000,
      status: "Active",
      avatar: `https://i.pravatar.cc/120?u=${id}`,
      password: "emp123"
    });
    emps.push(emp);
  }

  console.log("Seeding tasks...");
  for (let i = 1; i <= 20; i++) {
    await Task.create({
      id: `TASK${pad(i)}`,
      title: `Task ${i}`,
      description: "Complete this task soon.",
      assignedTo: rand(emps).id,
      priority: "medium",
      dueDate: "2026-12-31",
      status: rand(["Pending", "In Progress", "Completed"]),
      progress: 50,
      createdAt: new Date().toISOString()
    });
  }
  
  console.log("Database seeded successfully!");
  process.exit(0);
}

seed().catch(console.error);
