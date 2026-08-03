// scripts/test-email.ts
import "dotenv/config";
import nodemailer from "nodemailer";
import dns from "dns";

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

async function main() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE !== undefined 
    ? process.env.SMTP_SECURE === "true" 
    : port === 465;

  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    family: 4,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  } as nodemailer.TransportOptions);

  const info = await transporter.sendMail({
    from: `"PMOS Login" <${user}>`,
    to: user || "your-personal-email@example.com",
    subject: "SMTP test",
    text: "If you're reading this, Gmail SMTP is working.",
  });

  console.log("Sent:", info.messageId);
}

main().catch(console.error);