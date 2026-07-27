import { Request, Response } from "express";
import { pipelineService } from "../../../../services/pipeline.service";

export const updatePipelineHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const pipeline = await pipelineService.update(id, req.body);
    res.json(pipeline);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
