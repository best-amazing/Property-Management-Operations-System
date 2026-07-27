import { Request, Response } from "express";
import { ticketService } from "../../../../services/ticket.service";

export const deleteTicketHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await ticketService.delete(id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
