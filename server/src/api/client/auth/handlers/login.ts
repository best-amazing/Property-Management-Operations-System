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
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const code = generateOtp();
    const codeHash = await bcrypt.hash(code, 10);
    const sessionToken = crypto.randomBytes(32).toString("hex");

    await prisma.pendingLogin.create({
      data: {
        token: sessionToken,
        userId: user.id,
        codeHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    try {
      await sendOtpEmail(user.username, code);
    } catch {
      res.status(502).json({ error: "Failed to send verification code" });
      return;
    }

    res.json({ requiresOtp: true, loginSessionToken: sessionToken });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
