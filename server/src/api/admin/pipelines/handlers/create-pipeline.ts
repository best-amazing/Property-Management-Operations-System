import { Request, Response } from "express";
import { pipelineService } from "../../../../services/pipeline.service";

export const createPipelineHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { department_id, label, code, stages } = req.body;

    if (!department_id) {
      res.status(400).json({ error: "department_id is required." });
      return;
    }
    if (!label?.trim()) {
      res.status(400).json({ error: "Pipeline label is required." });
      return;
    }
    if (!Array.isArray(stages) || stages.filter(Boolean).length < 2) {
      res.status(400).json({ error: "At least 2 stages are required." });
      return;
    }

    const pipeline = await pipelineService.create({
      ...req.body,
      label: label.trim(),
      code: (code || "").trim().toUpperCase(),
      created_by: (req as any).user?.username || "admin",
    });
    res.status(201).json(pipeline);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

