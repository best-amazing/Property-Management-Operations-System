import { Request, Response } from "express";
import { pipelineService } from "../../../../services/pipeline.service";

export const deletePipelineHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await pipelineService.delete(id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
