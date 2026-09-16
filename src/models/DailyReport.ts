import mongoose from "mongoose";

const DailyReportSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    designation: { type: String, required: true },
    reportDate: { type: String, required: true }, // YYYY-MM-DD
    reportDay: { type: String, required: true }, // e.g. Friday
    attendance: { type: String, default: "Present" },
    reportSlot1: { type: String, default: "" }, // 9:30 am - 11:00 am Report
    reportSlot2: { type: String, default: "" }, // 11:20 am - 1:30 pm Report
    reportSlot3: { type: String, default: "" }, // 2:30 pm - 4:00 pm Report
    reportSlot4: { type: String, default: "" }, // 4:00 pm - 7:00 pm Report
    directorCallTiming: { type: String, default: "" }, // Call Timing with Director
    internalMeeting: { type: String, default: "" }, // Internal Office Meeting
    submittedAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

export const DailyReport =
  mongoose.models.DailyReport || mongoose.model("DailyReport", DailyReportSchema);
