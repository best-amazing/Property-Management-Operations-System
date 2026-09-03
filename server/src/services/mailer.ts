// services/mailer.ts
import nodemailer from "nodemailer";
import dns from "dns";

// Force IPv4 DNS resolution – the hosting environment lacks IPv6 connectivity
dns.setDefaultResultOrder("ipv4first");

export async function sendEmail(toEmail: string, subject: string, htmlBody: string) {
  const senderEmail = process.env.GOOGLE_EMAIL || process.env.GMAIL_USER || "me";
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error("Missing GMAIL_USER or GMAIL_APP_PASSWORD in environment variables");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    family: 4,          // force IPv4 – avoids ENETUNREACH on IPv6-only resolves
    auth: {
      user: user,
      pass: pass,
    },
  } as any);

  console.log(`[mailer] Sending email to=${toEmail} subject="${subject}" from=${senderEmail}`);

  try {
    await transporter.sendMail({
      from: `"PMOS" <${senderEmail}>`,
      to: toEmail,
      subject: subject,
      html: htmlBody,
    });
    console.log(`[mailer] Email sent OK to=${toEmail} subject="${subject}"`);
  } catch (err: any) {
    console.error(`[mailer] Email send FAILED to=${toEmail} subject="${subject}": ${err.message}`);
    throw err;
  }
}

export async function sendOtpEmail(toEmail: string, code: string) {
  const body = `<p>Your PMOS login verification code is <strong>${code}</strong>.</p><p>It expires in 5 minutes. If you didn't request this, ignore this email.</p>`;
  await sendEmail(toEmail, "Your PMOS login code", body);
}
