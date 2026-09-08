import { Request, Response } from "express";
import { departmentService } from "../../../../services/department.service";

export const getDepartmentsHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const departments = await departmentService.findAll();
    res.json(departments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
