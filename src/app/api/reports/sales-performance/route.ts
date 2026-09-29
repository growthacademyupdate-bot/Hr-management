import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import { Employee } from "@/models/Employee";
import { Lead } from "@/models/Lead";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const employeeId = searchParams.get("employeeId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const currentUserRole = searchParams.get("role");
    const currentUserId = searchParams.get("userId"); // employeeId of requester

    if (!currentUserRole) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    // Determine which employees to fetch
    const empQuery: any = { jobRole: "Sales", status: "Active" };
    
    if (currentUserRole === "employee") {
      // Sales employee can only see themselves
      empQuery.id = currentUserId;
    } else if (employeeId && employeeId !== "all") {
      // Admin/HR filtering by specific employee
      empQuery.id = employeeId;
    }

    const salesEmployees = await Employee.find(empQuery).lean();
    const employeeIds = salesEmployees.map((e: any) => e.id);

    // Build Lead match query
    const leadMatch: any = {
      employeeId: { $in: employeeIds }
    };

    if (startDate && endDate) {
      // Use correct Mongoose Date objects
      const start = new Date(startDate); start.setHours(0,0,0,0);
      const end = new Date(endDate); end.setHours(23,59,59,999);
      leadMatch.createdAt = {
        $gte: start,
        $lte: end
      };
    }

    // Perform Aggregation
    const aggregatedData = await Lead.aggregate([
      { $match: leadMatch },
      {
        $group: {
          _id: "$employeeId",
          // Leads
          INTERESTED: { $sum: { $cond: [{ $eq: ["$leadStatus", "INTERESTED"] }, 1, 0] } },
          NOT_INTERESTED: { $sum: { $cond: [{ $eq: ["$leadStatus", "NOT_INTERESTED"] }, 1, 0] } },
          NOT_ELIGIBLE: { $sum: { $cond: [{ $eq: ["$leadStatus", "NOT_ELIGIBLE"] }, 1, 0] } },
          CALL_NOT_RECEIVED: { $sum: { $cond: [{ $eq: ["$leadStatus", "CALL_NOT_RECEIVED"] }, 1, 0] } },
          NOT_CONNECTED: { $sum: { $cond: [{ $eq: ["$leadStatus", "NOT_CONNECTED"] }, 1, 0] } },
          CONVERTED: { $sum: { $cond: [{ $eq: ["$leadStatus", "CONVERTED"] }, 1, 0] } },
          POSITIVE: { $sum: { $cond: [{ $eq: ["$leadStatus", "POSITIVE"] }, 1, 0] } },
          totalLeads: { $sum: 1 },

          // Loans
          LOGIN: { $sum: { $cond: [{ $eq: ["$loanStatus", "LOGIN"] }, 1, 0] } },
          REJECTED: { $sum: { $cond: [{ $eq: ["$loanStatus", "REJECTED"] }, 1, 0] } },
          PENDING: { $sum: { $cond: [{ $eq: ["$loanStatus", "PENDING"] }, 1, 0] } },
          PENDING_DISBURSEMENT: { $sum: { $cond: [{ $eq: ["$loanStatus", "PENDING_DISBURSEMENT"] }, 1, 0] } },
          totalLoans: {
            $sum: {
              $cond: [
                { $in: ["$loanStatus", ["LOGIN", "REJECTED", "PENDING", "PENDING_DISBURSEMENT"]] },
                1,
                0
              ]
            }
          },

          // Documents
          DOC_RECEIVED: { $sum: { $cond: [{ $eq: ["$documentStatus", "DOC_RECEIVED"] }, 1, 0] } },
          DOC_PENDING: { $sum: { $cond: [{ $eq: ["$documentStatus", "DOC_PENDING"] }, 1, 0] } },
          DOC_VERIFIED: { $sum: { $cond: [{ $eq: ["$documentStatus", "DOC_VERIFIED"] }, 1, 0] } },
          DOC_REJECTED: { $sum: { $cond: [{ $eq: ["$documentStatus", "DOC_REJECTED"] }, 1, 0] } },
          totalDocuments: {
            $sum: {
              $cond: [
                { $in: ["$documentStatus", ["DOC_RECEIVED", "DOC_PENDING", "DOC_VERIFIED", "DOC_REJECTED"]] },
                1,
                0
              ]
            }
          },

          // Business Services
          CONSTRUCTION_INTERIOR: { $sum: { $cond: ["$constructionInteriorWork", 1, 0] } },
          DIGITAL_MARKETING_GMB: { $sum: { $cond: ["$gmbProfileWork", 1, 0] } },
          WEBSITE_DEVELOPMENT: { $sum: { $cond: ["$websiteWork", 1, 0] } },
          LOGO_DESIGN: { $sum: { $cond: ["$logoWork", 1, 0] } },
          DOCUMENTATION_WORK: { $sum: { $cond: ["$documentationWork", 1, 0] } },
        }
      }
    ]);

    // Format Data
    const summary = {
      totalSalesEmployees: salesEmployees.length,
      totalLeads: 0,
      totalPositiveCustomers: 0,
      totalLoans: 0,
      totalDocuments: 0,
      totalBusinessServices: 0
    };

    const employeesData = salesEmployees.map((emp: any) => {
      const agg = aggregatedData.find(a => a._id === emp.id) || {};
      
      const empData = {
        employeeId: emp.id,
        name: emp.name,
        jobRole: emp.jobRole,
        leads: {
          INTERESTED: agg.INTERESTED || 0,
          NOT_INTERESTED: agg.NOT_INTERESTED || 0,
          NOT_ELIGIBLE: agg.NOT_ELIGIBLE || 0,
          CALL_NOT_RECEIVED: agg.CALL_NOT_RECEIVED || 0,
          NOT_CONNECTED: agg.NOT_CONNECTED || 0,
          CONVERTED: agg.CONVERTED || 0,
          POSITIVE: agg.POSITIVE || 0,
          TOTAL: agg.totalLeads || 0
        },
        loans: {
          LOGIN: agg.LOGIN || 0,
          REJECTED: agg.REJECTED || 0,
          PENDING: agg.PENDING || 0,
          PENDING_OF_DISBURSEMENT: agg.PENDING_DISBURSEMENT || 0,
          TOTAL: agg.totalLoans || 0
        },
        documents: {
          DOC_RECEIVED: agg.DOC_RECEIVED || 0,
          DOC_PENDING: agg.DOC_PENDING || 0,
          DOC_VERIFIED: agg.DOC_VERIFIED || 0,
          DOC_REJECTED: agg.DOC_REJECTED || 0,
          TOTAL: agg.totalDocuments || 0
        },
        businessServices: {
          CONSTRUCTION_INTERIOR: agg.CONSTRUCTION_INTERIOR || 0,
          DIGITAL_MARKETING_GMB: agg.DIGITAL_MARKETING_GMB || 0,
          WEBSITE_DEVELOPMENT: agg.WEBSITE_DEVELOPMENT || 0,
          LOGO_DESIGN: agg.LOGO_DESIGN || 0,
          DOCUMENTATION_WORK: agg.DOCUMENTATION_WORK || 0,
          TOTAL: (agg.CONSTRUCTION_INTERIOR || 0) + (agg.DIGITAL_MARKETING_GMB || 0) + (agg.WEBSITE_DEVELOPMENT || 0) + (agg.LOGO_DESIGN || 0) + (agg.DOCUMENTATION_WORK || 0)
        }
      };

      // Add to summary
      summary.totalLeads += empData.leads.TOTAL;
      summary.totalPositiveCustomers += empData.leads.POSITIVE;
      summary.totalLoans += empData.loans.TOTAL;
      summary.totalDocuments += empData.documents.TOTAL;
      summary.totalBusinessServices += empData.businessServices.TOTAL;

      return empData;
    });

    return NextResponse.json({
      success: true,
      summary,
      employees: employeesData
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
