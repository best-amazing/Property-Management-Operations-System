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

export async function sendOtpEmail(toEmail: string, code: string) {
  const gmail = getGmailClient();
  const senderEmail = process.env.GOOGLE_EMAIL || process.env.GMAIL_USER || "me";

  const messageLines = [
    `From: "PMOS Login" <${senderEmail}>`,
    `To: ${toEmail}`,
    "Subject: Your PMOS login code",
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    "",
    `<p>Your PMOS login verification code is <strong>${code}</strong>.</p><p>It expires in 5 minutes. If you didn't request this, ignore this email.</p>`,
  ];

  const rawMessage = Buffer.from(messageLines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: rawMessage,
    },
  });
}