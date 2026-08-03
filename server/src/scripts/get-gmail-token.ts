import "dotenv/config";
import { google } from "googleapis";
import readline from "node:readline";

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || "http://localhost";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌ Please ensure GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET are set in your .env file.");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const url = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/gmail.send"],
});

console.log("\n=======================================================");
console.log("Authorize this app by visiting this URL in your browser:");
console.log("=======================================================\n");
console.log(url);
console.log("\n=======================================================\n");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter the authorization code from the redirect URL (code=... parameter): ", async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());
    console.log("\n✅ Tokens received successfully!\n");
    console.log("Add the following line to your .env file:\n");
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log("\nFull Token Info:");
    console.log(JSON.stringify(tokens, null, 2));
  } catch (error) {
    console.error("❌ Error retrieving refresh token:", error);
  }
});
