import { Request, Response } from "express";
import { ticketService } from "../../../../services/ticket.service";

export const updateChecklistHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { checklist } = req.body;
    const ticket = await ticketService.updateChecklist(id, checklist);
    res.json(ticket);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
