import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function GET() {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: "test@example.com",
      subject: "Test Email",
      text: "Test email body",
    };

    const info = await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true, info, envUser: process.env.SMTP_USER });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, envUser: process.env.SMTP_USER });
  }
}
