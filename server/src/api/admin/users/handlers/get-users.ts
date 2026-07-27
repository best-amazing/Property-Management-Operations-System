import { Request, Response } from "express";
import { userService } from "../../../../services/user.service";

export const getUsersHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await userService.findAll();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
