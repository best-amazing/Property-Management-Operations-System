import { Request, Response } from "express";
import { ticketService } from "../../../../services/ticket.service";

export const getTicketHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const ticket = await ticketService.findById(id);
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }
    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
