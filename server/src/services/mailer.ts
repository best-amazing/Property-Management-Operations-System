// services/mailer.ts
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

export async function sendEmail(toEmail: string, subject: string, htmlBody: string) {
  // IMPORTANT: For SendGrid, this 'from' email MUST exactly match the 
  // "Single Sender Verification" address you configured in the SendGrid dashboard.
  // If it does not match, the API will return a 403 Forbidden error.
  const senderEmail = process.env.GOOGLE_EMAIL || "bestusawatches@gmail.com"; 

  console.log(`[mailer] Sending email via SendGrid to=${toEmail} subject="${subject}" from=${senderEmail}`);

  try {
    const msg = {
      to: toEmail,
      from: {
        email: senderEmail,
        name: "PMOS",
      },
      subject: subject,
      html: htmlBody,
    };

    await sgMail.send(msg);
    
    console.log(`[mailer] Email sent OK to=${toEmail} subject="${subject}" (via SendGrid)`);
  } catch (err: any) {
    console.error(`[mailer] Email send FAILED to=${toEmail} subject="${subject}": ${err.message}`);
    if (err.response) {
      console.error(err.response.body);
    }
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