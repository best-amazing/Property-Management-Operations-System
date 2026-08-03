// services/mailer.ts
import nodemailer from "nodemailer";
import dns from "dns";

// Force Node.js to resolve IPv4 addresses first.
// Render and many cloud containers do not support outbound IPv6, leading to ENETUNREACH errors.
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

const host = process.env.SMTP_HOST || "smtp.gmail.com";
const port = parseInt(process.env.SMTP_PORT || "465", 10);
const secure = process.env.SMTP_SECURE !== undefined 
  ? process.env.SMTP_SECURE === "true" 
  : port === 465;

const user = process.env.SMTP_USER || process.env.GMAIL_USER;
const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
const fromHeader = process.env.SMTP_FROM || (user ? `"PMOS Login" <${user}>` : `"PMOS Login" <noreply@pmos.com>`);

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: user && pass ? { user, pass } : undefined,
  family: 4, // Force IPv4 socket family
  connectionTimeout: 10000, // 10s connection timeout to avoid hanging Express requests
  greetingTimeout: 10000,
  socketTimeout: 10000,
} as nodemailer.TransportOptions);

export async function sendOtpEmail(toEmail: string, code: string) {
  await transporter.sendMail({
    from: fromHeader,
    to: toEmail,
    subject: "Your PMOS login code",
    text: `Your PMOS login verification code is ${code}. It expires in 5 minutes. If you didn't request this, ignore this email.`,
    html: `<p>Your PMOS login verification code is <strong>${code}</strong>.</p><p>It expires in 5 minutes. If you didn't request this, ignore this email.</p>`,
  });
}