import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

export const verifyOtpHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { loginSessionToken, code } = req.body;

    const pending = await prisma.pendingLogin.findUnique({
      where: { token: loginSessionToken },
    });

    if (!pending || pending.used || pending.expiresAt < new Date()) {
      console.log(`[auth:verify-otp] REJECTED session=${loginSessionToken} (expired or already used)`);
      res.status(401).json({ error: "Session expired, please log in again" });
      return;
    }

    if (pending.attempts >= 3) {
      console.log(`[auth:verify-otp] REJECTED session=${loginSessionToken} user=${pending.userId} (too many attempts)`);
      res.status(429).json({ error: "Too many attempts, please log in again" });
      return;
    }

    const matches = await bcrypt.compare(code, pending.codeHash);

    if (!matches) {
      await prisma.pendingLogin.update({
        where: { id: pending.id },
        data: { attempts: { increment: 1 } },
      });
      console.log(`[auth:verify-otp] INVALID code for session=${loginSessionToken} user=${pending.userId} attempt=${pending.attempts + 1}/3`);
      res.status(401).json({ error: "Invalid code" });
      return;
    }

    await prisma.pendingLogin.update({
      where: { id: pending.id },
      data: { used: true },
    });

    const user = await prisma.user.findUnique({ where: { id: pending.userId } });
    if (!user) {
      console.error(`[auth:verify-otp] REJECTED session=${loginSessionToken} user=${pending.userId} (user not found)`);
      res.status(401).json({ error: "User not found" });
      return;
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, display_name: user.display_name },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    console.log(`[auth:verify-otp] SUCCESS session=${loginSessionToken} user=${user.id} username=${user.username}`);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        created_at: user.created_at,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
