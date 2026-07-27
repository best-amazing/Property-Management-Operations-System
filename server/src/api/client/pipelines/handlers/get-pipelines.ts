import { Request, Response } from "express";
import { pipelineService } from "../../../../services/pipeline.service";

export const getPipelinesHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const pipelines = await pipelineService.findAll();
    res.json(pipelines);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
