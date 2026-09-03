// services/mailer.ts
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import dns from "dns";

// Force IPv4-only resolution for nodemailer's socket connections.
// Render's network doesn't support IPv6 egress, so any AAAA record
// causes ENETUNREACH. family:4 alone isn't consistently honored by
// nodemailer's connection setup, so we override the lookup function directly.
function ipv4Lookup(
  hostname: string,
  options: dns.LookupOneOptions,
  callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void
) {
  dns.lookup(hostname, { family: 4 }, callback);
}

export async function sendEmail(toEmail: string, subject: string, htmlBody: string) {
  const senderEmail = process.env.GOOGLE_EMAIL || process.env.GMAIL_USER || "me";
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error("Missing GMAIL_USER or GMAIL_APP_PASSWORD in environment variables");
  }

  // Cast needed: @types/nodemailer@8.0.1 doesn't include `family` or `lookup`
  // in its type definitions, but nodemailer 9.x supports them at runtime.
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    family: 4,
    lookup: ipv4Lookup, // <-- key addition
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