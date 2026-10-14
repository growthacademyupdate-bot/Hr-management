import nodemailer from "nodemailer";

export function getEmailTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;

  const host = process.env.SMTP_HOST || "smtp.zoho.in";
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false
    }
  });
}

export function getDefaultFromAddress() {
  const user = process.env.SMTP_USER || "manasi.hr@al-mawa.international";
  return `"Almawa International HR" <${user}>`;
}

export async function sendEmail({
  to,
  subject,
  html,
  text
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}) {
  const transporter = getEmailTransporter();
  if (!transporter) {
    console.warn("[EmailService] SMTP credentials not configured. Skipping email:", subject);
    return false;
  }

  const recipients = Array.isArray(to) ? to.filter(Boolean).join(",") : to;
  if (!recipients) return false;

  const from = getDefaultFromAddress();

  try {
    const info = await transporter.sendMail({
      from,
      to: recipients,
      subject,
      text: text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      html,
    });
    console.log(`[EmailService] Email sent successfully to [${recipients}], MessageId: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`[EmailService] Failed to send email to [${recipients}]:`, error.message);
    return false;
  }
}

// 1. Employee Account Credentials Email
export async function sendEmployeeCredentialsEmail(
  email: string,
  name: string,
  empId: string,
  plainPassword: string
) {
  if (!email) return;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f3f4f6;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 700;">Almawa International</h1>
        <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Human Resources Management Portal</p>
      </div>

      <div style="margin-bottom: 24px;">
        <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin-bottom: 8px;">Welcome, ${name}!</h2>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.5; margin: 0;">
          Your official employee profile has been created. You can now log into your portal to mark attendance, apply for leaves, submit expenses, and access your salary slips.
        </p>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <h3 style="color: #1e293b; font-size: 16px; font-weight: 600; margin-top: 0; margin-bottom: 16px;">Your Login Credentials</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; width: 130px;">Login ID (Email):</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Employee ID:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${empId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Password:</td>
            <td style="padding: 6px 0; color: #4f46e5; font-weight: 700; font-family: monospace; font-size: 15px;">${plainPassword}</td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f3f4f6; color: #9ca3af; font-size: 12px; text-align: center;">
        <p style="margin: 0;">Please keep your credentials confidential. You can update your password upon first login.</p>
        <p style="margin: 4px 0 0 0;">Almawa International &copy; ${new Date().getFullYear()} All rights reserved.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Welcome to Almawa International - Your Employee Login Credentials`,
    html,
  });
}

// 2. Leave Application Emails
export async function sendLeaveApplicationEmail({
  employeeName,
  employeeEmail,
  leaveType,
  startDate,
  endDate,
  numberOfDays,
  reason,
  hrEmail,
  adminEmail,
}: {
  employeeName: string;
  employeeEmail?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason: string;
  hrEmail?: string;
  adminEmail?: string;
}) {
  const isHalfDay = numberOfDays === 0.5 || /half/i.test(leaveType);
  const durationText = isHalfDay ? "Half Day (0.5 Day)" : `${numberOfDays} Day${numberOfDays > 1 ? "s" : ""}`;
  const dateText = startDate === endDate ? startDate : `${startDate} to ${endDate}`;

  // Notify HR & Admin
  const adminRecipients = [
    hrEmail || process.env.HR_USERNAME || "manasi.hr@al-mawa.international",
    adminEmail || process.env.ADMIN_USERNAME || "internationalalmawa@gmail.com",
  ].filter(Boolean);

  const managerHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #4f46e5; margin-top: 0;">New Leave Application</h2>
      <p style="color: #374151; font-size: 15px;">
        <strong>${employeeName}</strong> has applied for leave.
      </p>

      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 6px 0; font-size: 14px;"><strong>Employee:</strong> ${employeeName}</p>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Leave Type:</strong> <span style="background-color: #ede9fe; color: #6d28d9; padding: 2px 8px; border-radius: 4px; font-weight: 600;">${leaveType}</span></p>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Duration:</strong> ${durationText} (${dateText})</p>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Reason:</strong> ${reason || "Not specified"}</p>
      </div>

      <p style="color: #6b7280; font-size: 14px;">Please review and approve this leave in the HR portal.</p>
    </div>
  `;

  await sendEmail({
    to: adminRecipients,
    subject: `Leave Application: ${employeeName} - ${leaveType} (${durationText})`,
    html: managerHtml,
  });

  // Notify Employee confirmation
  if (employeeEmail) {
    const employeeHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #4f46e5; margin-top: 0;">Leave Application Submitted</h2>
        <p style="color: #374151; font-size: 15px;">Dear ${employeeName},</p>
        <p style="color: #374151; font-size: 15px;">Your leave application has been submitted successfully and is pending review by HR and Admin.</p>

        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 6px 0; font-size: 14px;"><strong>Leave Type:</strong> ${leaveType}</p>
          <p style="margin: 6px 0; font-size: 14px;"><strong>Dates:</strong> ${dateText}</p>
          <p style="margin: 6px 0; font-size: 14px;"><strong>Total Days:</strong> ${durationText}</p>
          <p style="margin: 6px 0; font-size: 14px;"><strong>Reason:</strong> ${reason}</p>
          <p style="margin: 6px 0; font-size: 14px;"><strong>Status:</strong> <span style="color: #d97706; font-weight: 600;">Pending Review</span></p>
        </div>

        <p style="color: #6b7280; font-size: 12px;">You will receive an update once your request has been reviewed.</p>
      </div>
    `;

    await sendEmail({
      to: employeeEmail,
      subject: `Leave Request Submitted: ${leaveType} (${durationText})`,
      html: employeeHtml,
    });
  }
}

// 3. Leave Review Status Email
export async function sendLeaveStatusEmail({
  employeeName,
  employeeEmail,
  leaveType,
  startDate,
  endDate,
  status,
  reviewerRole,
  comment,
}: {
  employeeName: string;
  employeeEmail: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: "approved" | "rejected";
  reviewerRole: "HR" | "Admin";
  comment?: string;
}) {
  if (!employeeEmail) return;

  const isApproved = status === "approved";
  const statusColor = isApproved ? "#059669" : "#dc2626";
  const statusText = isApproved ? "Approved" : "Rejected";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: ${statusColor}; margin-top: 0;">Leave Request ${statusText}</h2>
      <p style="color: #374151; font-size: 15px;">Dear ${employeeName},</p>
      <p style="color: #374151; font-size: 15px;">Your leave request has been <strong>${statusText.toLowerCase()}</strong> by ${reviewerRole}.</p>

      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 6px 0; font-size: 14px;"><strong>Leave Type:</strong> ${leaveType}</p>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Dates:</strong> ${startDate} to ${endDate}</p>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Decision:</strong> <span style="color: ${statusColor}; font-weight: 700;">${statusText}</span></p>
        ${comment ? `<p style="margin: 6px 0; font-size: 14px;"><strong>Review Remarks:</strong> ${comment}</p>` : ""}
      </div>

      <p style="color: #6b7280; font-size: 13px;">You can view the full status in your employee portal.</p>
    </div>
  `;

  return sendEmail({
    to: employeeEmail,
    subject: `Leave Request ${statusText}: ${startDate} to ${endDate}`,
    html,
  });
}

// 4. Salary Slip Credited Email
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export async function sendSalaryCreditEmail(salarySlip: any) {
  const email = salarySlip.employeeSnapshot?.email;
  const name = salarySlip.employeeSnapshot?.name || "Employee";
  if (!email) {
    console.warn("[EmailService] No email found for salary slip employee, skipping email:", salarySlip.employeeId);
    return false;
  }

  const monthName = MONTH_NAMES[(salarySlip.salaryMonth || 1) - 1] || `Month ${salarySlip.salaryMonth}`;
  const year = salarySlip.salaryYear || new Date().getFullYear();
  const netSalaryFormatted = Number(salarySlip.netSalary || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
  const grossEarningsFormatted = Number(salarySlip.totalEarnings || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
  const deductionsFormatted = Number(salarySlip.totalDeductions || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f3f4f6;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 700;">Almawa International</h1>
        <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Monthly Salary Credit Notification</p>
      </div>

      <div style="margin-bottom: 20px;">
        <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin-bottom: 8px;">Hello, ${name}</h2>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.5; margin: 0;">
          We are pleased to inform you that your salary for <strong>${monthName} ${year}</strong> has been credited to your bank account.
        </p>
      </div>

      <!-- Highlighted Net Salary Card -->
      <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; border-radius: 10px; padding: 24px; text-align: center; margin: 24px 0;">
        <p style="margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">Net Salary Credited</p>
        <h2 style="margin: 8px 0 0 0; font-size: 32px; font-weight: 800; color: #ffffff;">${netSalaryFormatted}</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">${salarySlip.amountInWords || ""}</p>
      </div>

      <!-- Salary Breakdown Table -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h3 style="color: #1e293b; font-size: 15px; font-weight: 600; margin-top: 0; margin-bottom: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Payslip Summary</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Employee ID:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 600; text-align: right;">${salarySlip.employeeId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Designation:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 600; text-align: right;">${salarySlip.employeeSnapshot?.designation || "Staff"}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Department:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 600; text-align: right;">${salarySlip.employeeSnapshot?.department || "General"}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Paid Days:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 600; text-align: right;">${salarySlip.paidDays ?? 30} Days</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Gross Earnings:</td>
            <td style="padding: 6px 0; color: #059669; font-weight: 600; text-align: right;">${grossEarningsFormatted}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Total Deductions:</td>
            <td style="padding: 6px 0; color: #dc2626; font-weight: 600; text-align: right;">${deductionsFormatted}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; margin-bottom: 24px; font-size: 13px; color: #1e40af;">
        <strong>How to download your full PDF Payslip:</strong>
        <p style="margin: 4px 0 0 0;">Log into your HR portal, navigate to the <strong>Salary Slips</strong> tab, and click <em>Download PDF</em>.</p>
      </div>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f3f4f6; color: #9ca3af; font-size: 12px; text-align: center;">
        <p style="margin: 0;">This is an automated payroll notification. Almawa International &copy; ${year}</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Salary Credited - Payslip for ${monthName} ${year} (${netSalaryFormatted})`,
    html,
  });
}

// 5. Expense Reimbursed / Paid Email
export async function sendExpenseReimbursedEmail({
  employeeName,
  employeeEmail,
  title,
  category,
  amount,
  expenseId,
}: {
  employeeName: string;
  employeeEmail: string;
  title: string;
  category: string;
  amount: number;
  expenseId: string;
}) {
  if (!employeeEmail) return;

  const formattedAmount = Number(amount || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #059669; margin-top: 0;">Expense Claim Reimbursed (Payment Disbursed)</h2>
      <p style="color: #374151; font-size: 15px;">Dear ${employeeName},</p>
      <p style="color: #374151; font-size: 15px;">
        Your expense claim has been approved by HR and Admin and marked as <strong>Reimbursed (Paid)</strong>. The payment has been released to your designated account.
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
        <p style="margin: 6px 0; font-size: 14px;"><strong>Claim ID:</strong> ${expenseId}</p>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Title / Purpose:</strong> ${title || category}</p>
        <p style="margin: 6px 0; font-size: 14px;"><strong>Category:</strong> ${category}</p>
        <p style="margin: 6px 0; font-size: 16px;"><strong>Amount Paid:</strong> <span style="color: #059669; font-weight: 700;">${formattedAmount}</span></p>
      </div>

      <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 13px; color: #92400e;">
        <strong>Action Required in HR Portal:</strong>
        <p style="margin: 4px 0 0 0;">
          Once the money reaches your bank or UPI account, please open your <strong>Dashboard</strong> or <strong>Expenses</strong> page and click <strong>"I Received the Money"</strong> to acknowledge receipt and clear your pending dashboard balance.
        </p>
      </div>

      <p style="color: #6b7280; font-size: 12px;">Thank you,<br/>Almawa International Finance & HR</p>
    </div>
  `;

  return sendEmail({
    to: employeeEmail,
    subject: `Payment Disbursed: Expense Claim ${expenseId} (${formattedAmount})`,
    html,
  });
}
