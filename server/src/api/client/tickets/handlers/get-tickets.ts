import { Request, Response } from "express";
import { ticketService } from "../../../../services/ticket.service";

export const getTicketsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const pipelineId = req.params.pipelineId as string;
    const { mine } = req.query;
    
    let explicitAssignedTo = undefined;
    if (mine === "true" && (req as any).user) {
      explicitAssignedTo = (req as any).user.display_name;
    }

    const tickets = await ticketService.findAllByPipeline(pipelineId, (req as any).user, explicitAssignedTo);
    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
