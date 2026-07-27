import { Request, Response } from "express";
import { pipelineService } from "../../../../services/pipeline.service";

export const getPipelineHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const pipeline = await pipelineService.findById(id);
    if (!pipeline) {
      res.status(404).json({ error: "Pipeline not found" });
      return;
    }
    res.json(pipeline);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
