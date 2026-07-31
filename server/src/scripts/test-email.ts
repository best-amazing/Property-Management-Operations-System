// scripts/test-email.ts
import "dotenv/config";
import nodemailer from "nodemailer";

async function main() {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER!,
      pass: process.env.GMAIL_APP_PASSWORD!,
    },
  });

  const info = await transporter.sendMail({
    from: `"PMOS Login" <${process.env.GMAIL_USER}>`,
    to: "your-personal-email@example.com", // send to yourself first
    subject: "SMTP test",
    text: "If you're reading this, Gmail SMTP is working.",
  });

  console.log("Sent:", info.messageId);
}

main().catch(console.error);