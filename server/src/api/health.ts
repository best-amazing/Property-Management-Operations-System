import { Router } from "express";
import prisma from "../utils/prisma";

const healthRouter = Router();

/**
 * GET /health/db
 * Pings the database with a lightweight query to prevent the connection from
 * going idle on free-tier hosts (e.g. Render, Neon, Supabase).
 * Hit this endpoint from an external cron service such as cron-job.org or
 * UptimeRobot every ~10 minutes:
 *   https://property-management-operations-system.onrender.com/health/db
 */
healthRouter.get("/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[health/db] Database ping failed:", error);
    res.status(503).json({ status: "error", message: "Database unreachable" });
  }
});

export default healthRouter;
