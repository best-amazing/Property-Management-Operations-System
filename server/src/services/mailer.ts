// services/mailer.ts
import { google } from "googleapis";

function getGmailClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Google OAuth environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN)");
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  return google.gmail({ version: "v1", auth });
}

export async function sendEmail(toEmail: string, subject: string, htmlBody: string) {
  const gmail = getGmailClient();
  const senderEmail = process.env.GOOGLE_EMAIL || process.env.GMAIL_USER || "me";

  console.log(`[mailer] Sending email to=${toEmail} subject="${subject}" from=${senderEmail}`);

  const messageLines = [
    `From: "PMOS" <${senderEmail}>`,
    `To: ${toEmail}`,
    `Subject: ${subject}`,
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    "",
    htmlBody,
  ];

  const rawMessage = Buffer.from(messageLines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  try {
    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: rawMessage,
      },
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
