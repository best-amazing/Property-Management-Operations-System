import { Request, Response } from "express";
import { pipelineService } from "../../../../services/pipeline.service";

export const createPipelineHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const pipeline = await pipelineService.create({
      ...req.body,
      created_by: (req as any).user?.username || "admin"
    });
    res.status(201).json(pipeline);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
