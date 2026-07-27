import { Request, Response } from "express";
import { noteService } from "../../../../services/note.service";

export const createNoteHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const ticketId = req.params.ticketId as string;
    const note = await noteService.create({
      ...req.body,
      ticket_id: ticketId,
      author: (req as any).user?.display_name || "Unknown",
    });
    res.status(201).json(note);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
