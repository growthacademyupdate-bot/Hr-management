import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // e.g., employeeId-date
  employeeId: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  loginTime: { type: String },
  logoutTime: { type: String },
  workingHours: { type: Number, default: 0 },
  status: { type: String, enum: ["Present", "Absent", "Leave", "Half Day"], default: "Absent" },
  productivity: { type: Number, default: 0 },
}, { timestamps: true });

export const Attendance = mongoose.models.Attendance || mongoose.model("Attendance", AttendanceSchema);
