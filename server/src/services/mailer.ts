// services/mailer.ts
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import dns from "dns/promises";

// Render's network has no IPv6 egress, so connecting to an AAAA record
// yields ENETUNREACH. nodemailer 9.x passes the hostname straight to
// net.createConnection (ignoring any `lookup` / `family` option), so the
// only reliable fix is to pre-resolve the hostname to an IPv4 address and
// hand the raw IP to the transporter, bypassing DNS at connect time.
async function resolveIPv4(hostname: string): Promise<string> {
  try {
    const addresses = await dns.resolve4(hostname);
    if (!addresses.length) throw new Error(`No A records for ${hostname}`);
    return addresses[0];
  } catch (err: any) {
    console.warn(`[mailer] dns.resolve4(${hostname}) failed, falling back to hostname: ${err.message}`);
    return hostname;
  }
}

export async function sendEmail(toEmail: string, subject: string, htmlBody: string) {
  const senderEmail = process.env.GOOGLE_EMAIL || process.env.GMAIL_USER || "me";
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error("Missing GMAIL_USER or GMAIL_APP_PASSWORD in environment variables");
  }

  // Pre-resolve to IPv4 so nodemailer never sees the hostname and can't pick AAAA.
  // We keep the original hostname in the `name` field so TLS SNI still works.
  const smtpHost = "smtp.gmail.com";
  const smtpIp = await resolveIPv4(smtpHost);
  console.log(`[mailer] Resolved ${smtpHost} -> ${smtpIp}`);

  // Cast needed: @types/nodemailer@8.0.1 doesn't declare all options that
  // nodemailer 9.x supports at runtime.
  const transporter = nodemailer.createTransport({
    host: smtpIp,              // raw IPv4 — no DNS lookup at connect time
    port: 465,                 // direct SSL (avoids Render blocking STARTTLS on 587)
    secure: true,              // SSL from the start, no STARTTLS upgrade needed
    name: smtpHost,            // used for EHLO
    tls: { servername: smtpHost }, // TLS cert validated against real hostname, not IP
    connectionTimeout: 10000,  // 10 s to establish TCP connection
    greetingTimeout: 10000,    // 10 s to receive SMTP greeting after connect
    socketTimeout: 30000,      // 30 s idle timeout during send
    auth: { user, pass },
  } as SMTPTransport.Options);

  console.log(`[mailer] Sending email to=${toEmail} subject="${subject}" from=${senderEmail}`);

  try {
    await transporter.sendMail({
      from: `"PMOS" <${senderEmail}>`,
      to: toEmail,
      subject,
      html: htmlBody,
    });
    console.log(`[mailer] Email sent OK to=${toEmail} subject="${subject}"`);
  } catch (err: any) {
    console.error(`[mailer] Email send FAILED to=${toEmail} subject="${subject}": ${err.message}`);
    throw err;
  }
}

export async function sendOtpEmail(toEmail: string, code: string) {
  const subject = "Your PMOS verification code";
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Verification Code</h2>
      <p>Your one-time verification code is:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2563eb;">${code}</p>
      <p>This code expires in 5 minutes. If you did not request this, please ignore this email.</p>
    </div>
  `;
  await sendEmail(toEmail, subject, htmlBody);
}