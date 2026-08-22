import mongoose from "mongoose";

const HolidaySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // e.g., HOL-2027-01-26
  name: { type: String, required: true },
  description: { type: String },
  holidayType: { 
    type: String, 
    enum: ["COMPANY_HOLIDAY", "OPTIONAL_HOLIDAY", "RESTRICTED_HOLIDAY", "CUSTOM_HOLIDAY"], 
    required: true,
    default: "COMPANY_HOLIDAY"
  },
  startDate: { type: String, required: true }, // YYYY-MM-DD
  endDate: { type: String, required: true },   // YYYY-MM-DD
  isActive: { type: Boolean, default: true },
  createdBy: { type: String }, // Employee ID
  updatedBy: { type: String }, // Employee ID
}, { timestamps: true });

delete mongoose.models.Holiday;
export const Holiday = mongoose.models.Holiday || mongoose.model("Holiday", HolidaySchema);
