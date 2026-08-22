import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema({
  loginAt: { type: Date, required: true },
  logoutAt: { type: Date, default: null },
  durationSeconds: { type: Number, default: 0 },
}, { _id: false });

const AttendanceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // e.g., employeeId-date
  employeeId: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  
  firstLoginAt: { type: Date },
  lastLogoutAt: { type: Date },
  
  totalWorkingSeconds: { type: Number, default: 0 },
  totalWorkingHours: { type: Number, default: 0 },
  
  sessions: [SessionSchema],

  status: { type: String, enum: ["Present", "Absent", "Leave", "Half Day", "Short Day", "Incomplete", "Pending", "Holiday"], default: "Absent" },
  productivity: { type: Number, default: 0 },
  
  // Keep legacy string fields to not completely break un-updated frontend components
  loginTime: { type: String },
  logoutTime: { type: String },
  workingHours: { type: Number, default: 0 },
}, { timestamps: true });

export const Attendance = mongoose.models.Attendance || mongoose.model("Attendance", AttendanceSchema);
