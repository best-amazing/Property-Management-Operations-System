import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getUsersHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        display_name: true,
        role: true,
        created_at: true,
        staff_type_id: true,
        team_id: true,
        staff_type: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { display_name: "asc" },
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
