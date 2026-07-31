import { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { userService } from "../../../../services/user.service";
import { generateOtp } from "../../../../utils/otp";
import { sendOtpEmail } from "../../../../services/mailer";

const prisma = new PrismaClient();

export const loginHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    const user = await userService.findByUsername(username);

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      console.log(`[auth:login] FAILED login attempt for username=${username} (invalid credentials)`);
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const code = generateOtp();
    const codeHash = await bcrypt.hash(code, 10);
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.pendingLogin.create({
      data: {
        token: sessionToken,
        userId: user.id,
        codeHash,
        expiresAt,
      },
    });

    console.log(`[auth:login] OTP issued for user=${user.id} username=${user.username} session=${sessionToken} expiresAt=${expiresAt.toISOString()}`);

    try {
      await sendOtpEmail(user.username, code);
    } catch (err: any) {
      console.error(`[auth:login] FAILED to send OTP email for user=${user.id} session=${sessionToken}: ${err.message}`);
      res.status(502).json({ error: "Failed to send verification code" });
      return;
    }

    console.log(`[auth:login] OTP email sent for user=${user.id} session=${sessionToken}`);
    res.json({ requiresOtp: true, loginSessionToken: sessionToken });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
