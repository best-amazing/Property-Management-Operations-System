import { Request, Response } from "express";
import { userService } from "../../../../services/user.service";

export const createUserHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await userService.create(req.body);
    res.status(201).json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
