import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /client/dashboard/policies
// Fetch categorized, published policies for the staff dashboard
router.get("/policies", async (req, res) => {
  try {
    const categories = await prisma.policyCategory.findMany({
      include: {
        policies: {
          where: { status: "published" },
          orderBy: { order: "asc" }
        }
      },
      orderBy: { order: "asc" }
    });
    // Filter out categories with no published policies if desired
    const activeCategories = categories.filter(cat => cat.policies.length > 0);
    res.json(activeCategories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dashboard policies" });
  }
});

// GET /client/dashboard/policies/:id
router.get("/policies/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const policy = await prisma.policy.findFirst({
      where: { id, status: "published" },
      include: { category: true }
    });
    if (!policy) return res.status(404).json({ error: "Policy not found or unpublished" });
    res.json(policy);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch policy" });
  }
});

export default router;
