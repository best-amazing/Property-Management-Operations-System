import { Request, Response } from "express";
import { userService } from "../../../../services/user.service";

export const deleteUserHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    // An admin cannot delete their own account
    if ((req as any).user?.id === id) {
      res.status(400).json({ error: "Cannot delete your own account" });
      return;
    }
    await userService.delete(id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
