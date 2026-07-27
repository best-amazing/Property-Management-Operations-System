import { Request, Response } from "express";
import { userService } from "../../../../services/user.service";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const updateUserHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { display_name, password, role } = req.body;
    
    const data: any = {};
    if (display_name) data.display_name = display_name;
    if (role) data.role = role;
    if (password) data.password_hash = await bcrypt.hash(password, 10);
    
    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, display_name: true, role: true, created_at: true },
    });
    
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
