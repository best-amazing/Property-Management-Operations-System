import { Request, Response } from "express";
import { userService } from "../../../../services/user.service";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const updateUserHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const updated = await userService.update(id, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
