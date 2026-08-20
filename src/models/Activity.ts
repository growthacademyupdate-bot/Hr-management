import mongoose from "mongoose";

const ActivitySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  employeeId: { type: String, required: true },
  actorId: { type: String },
  actorRole: { type: String },
  module: { type: String },
  referenceId: { type: String },
  time: { type: String, required: true }, // ISO string
  label: { type: String, required: true },
  type: { type: String, required: true },
  metadata: { type: Object }
}, { timestamps: true });

export const Activity = mongoose.models.Activity || mongoose.model("Activity", ActivitySchema);
