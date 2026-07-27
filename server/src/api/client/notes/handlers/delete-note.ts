import { Request, Response } from "express";
import { noteService } from "../../../../services/note.service";

export const deleteNoteHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await noteService.delete(id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
