// scripts/test-email.ts
import "dotenv/config";
import { sendOtpEmail } from "../services/mailer";

async function main() {
  const targetEmail = process.env.GOOGLE_EMAIL || process.env.GMAIL_USER || "ephraimedy@gmail.com";
  console.log(`Sending test OTP email to: ${targetEmail}...`);
  
  await sendOtpEmail(targetEmail, "123456");
  console.log("✅ Email sent successfully via Gmail REST API!");
}

main().catch((err) => {
  console.error("❌ Failed to send test email:", err);
});