import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getMeHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userPayload = (req as any).user;
    if (!userPayload) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userPayload.id },
      select: {
        id: true,
        username: true,
        display_name: true,
        role: true,
        created_at: true,
        staff_type: { select: { id: true, name: true, permissions: true, allowed_categories: true } },
        team: { select: { id: true, name: true } }
      }
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
