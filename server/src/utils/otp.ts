// services/otp.ts
import crypto from "crypto";

export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString(); // 6-digit numeric
}