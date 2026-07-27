import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const updateNoteHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { text } = req.body;
    const note = await prisma.note.update({
      where: { id },
      data: { text },
    });
    res.json(note);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
