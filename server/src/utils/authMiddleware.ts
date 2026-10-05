import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma";

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

// Team leads get the admin announcements tools, plus read access to the team
// and staff type lists the announcement audience picker needs. Everything else
// under /admin stays admin-only. Paths are relative to the /admin router.
const TEAM_LEAD_READABLE = new Set(["/teams", "/staff-types"]);

export const requireAdminOrTeamLeadAnnouncements = (req: Request, res: Response, next: NextFunction): void => {
  requireAuth(req, res, () => {
    const role = (req as any).user?.role;
    const path = req.path.replace(/\/+$/, "") || "/";
    const teamLeadAllowed =
      path === "/announcements" || path.startsWith("/announcements/") ||
      (req.method === "GET" && TEAM_LEAD_READABLE.has(path));
    if (role === "admin" || (role === "team_lead" && teamLeadAllowed)) {
      next();
      return;
    }
    res.status(403).json({ error: "Forbidden. Admin access required." });
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
