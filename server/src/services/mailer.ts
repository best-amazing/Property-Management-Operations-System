// services/mailer.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER!,        // e.g. pmos.noreply@gmail.com
    pass: process.env.GMAIL_APP_PASSWORD!, // the 16-char App Password, not your login password
  },
});

export async function sendOtpEmail(toEmail: string, code: string) {
  await transporter.sendMail({
    from: `"PMOS Login" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: "Your PMOS login code",
    text: `Your PMOS login verification code is ${code}. It expires in 5 minutes. If you didn't request this, ignore this email.`,
    html: `<p>Your PMOS login verification code is <strong>${code}</strong>.</p><p>It expires in 5 minutes. If you didn't request this, ignore this email.</p>`,
  });
}