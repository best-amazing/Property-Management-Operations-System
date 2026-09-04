import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  requireAuth(req, res, () => {
    if ((req as any).user?.role !== "admin") {
      res.status(403).json({ error: "Forbidden. Admin access required." });
      return;
    }
    next();
  });
};

export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    requireAuth(req, res, async () => {
      const user = (req as any).user;
      if (user?.role === "admin") {
        next();
        return;
      }
      
      if (!user?.staff_type_id) {
        res.status(403).json({ error: "Forbidden. No permissions assigned." });
        return;
      }
      
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();
      
      const staffType = await prisma.staffType.findUnique({
        where: { id: user.staff_type_id }
      });
      
      if (!staffType || !Array.isArray(staffType.permissions) || !staffType.permissions.includes(permission)) {
        res.status(403).json({ error: `Forbidden. Requires permission: ${permission}` });
        return;
      }
      
      next();
    });
  };
};
