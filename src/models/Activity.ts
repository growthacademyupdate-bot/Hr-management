import mongoose from "mongoose";

const ActivitySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true },
  time: { type: String, required: true }, // ISO string
  label: { type: String, required: true },
  type: { type: String, enum: ["login", "task", "break", "logout", "complete"], required: true },
}, { timestamps: true });

export const Activity = mongoose.models.Activity || mongoose.model("Activity", ActivitySchema);
