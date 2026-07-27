import { Request, Response } from "express";
import { ticketService } from "../../../../services/ticket.service";

export const createTicketHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const ticket = await ticketService.create(req.body);
    res.status(201).json(ticket);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
