import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { userService } from "../../../../services/user.service";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

export const loginHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    const user = await userService.findByUsername(username);

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, display_name: user.display_name },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        created_at: user.created_at,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
