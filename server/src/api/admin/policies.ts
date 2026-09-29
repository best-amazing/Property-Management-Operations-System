import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /admin/policies/categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await prisma.policyCategory.findMany({
      orderBy: { order: "asc" }
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// GET /admin/policies
router.get("/", async (req, res) => {
  try {
    const policies = await prisma.policy.findMany({
      include: { category: true },
      orderBy: { order: "asc" }
    });
    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch policies" });
  }
});

export default router;
