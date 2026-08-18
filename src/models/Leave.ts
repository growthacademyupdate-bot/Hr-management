import mongoose from "mongoose";

const LeaveSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true },
  type: { type: String, enum: ["Casual", "Sick", "Earned", "Unpaid"], required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  appliedAt: { type: String, required: true },
}, { timestamps: true });

export const Leave = mongoose.models.Leave || mongoose.model("Leave", LeaveSchema);
