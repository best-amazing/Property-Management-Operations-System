import { Request, Response } from "express";
import { noteService } from "../../../../services/note.service";

export const getNotesHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const ticketId = req.params.ticketId as string;
    const notes = await noteService.findAllByTicket(ticketId);
    res.json(notes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
