import { Request, Response } from "express";
import { ticketService } from "../../../../services/ticket.service";

export const updateTicketHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const user = (req as any).user ? { display_name: (req as any).user.display_name } : undefined;
    const ticket = await ticketService.update(id, req.body, user);
    res.json(ticket);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
