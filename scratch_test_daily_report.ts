import mongoose from "mongoose";
import connectDB from "./src/lib/mongoose";
import { addDailyReport, getDailyReports, deleteDailyReport } from "./src/app/actions";

async function runTest() {
  try {
    await connectDB();
    console.log("Connected to MongoDB successfully.");

    const testReport = await addDailyReport(
      {
        employeeId: "EMP001",
        employeeName: "Test Employee",
        designation: "Software Engineer",
        reportDate: "2026-09-11",
        reportDay: "Friday",
        attendance: "Present",
        reportSlot1: "Worked on UI components and Daily Task Report feature.",
        reportSlot2: "Integrated Mongoose schema and store state management.",
        reportSlot3: "Added responsive layout and auto-fill logic.",
        reportSlot4: "Testing and verification of daily report flow.",
        directorCallTiming: "15 Minutes",
        internalMeeting: "30 Minutes",
      },
      "EMP001",
      "employee"
    );

    console.log("Created test daily report:", testReport.id);

    const reports = await getDailyReports("employee", "EMP001");
    console.log(`Fetched ${reports.length} reports for EMP001.`);

    const found = reports.find((r: any) => r.id === testReport.id);
    if (!found) {
      throw new Error("Created report not found in fetched list!");
    }
    console.log("Verified report content matches:", found.employeeName === "Test Employee");

    // Clean up test report
    await deleteDailyReport(testReport.id, "EMP001", "employee");
    console.log("Deleted test report successfully. All tests passed!");
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

runTest();
