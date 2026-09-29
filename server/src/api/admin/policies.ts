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

// POST /admin/policies/categories
router.post("/categories", async (req, res) => {
  try {
    const { name, order } = req.body;
    const category = await prisma.policyCategory.create({
      data: { name, order: order || 0 }
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: "Failed to create category" });
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

// POST /admin/policies
router.post("/", async (req, res) => {
  try {
    const { title, content, category_id, order, status, attachments } = req.body;
    const user = (req as any).user;
    
    const policy = await prisma.policy.create({
      data: {
        title,
        content,
        category_id,
        status: status || "draft",
        order: order || 0,
        attachments: attachments || [],
        created_by: user ? user.id : "system",
      }
    });
    res.json(policy);
  } catch (error) {
    res.status(500).json({ error: "Failed to create policy" });
  }
});

// PUT /admin/policies/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const policy = await prisma.policy.update({
      where: { id },
      data
    });
    res.json(policy);
  } catch (error) {
    res.status(500).json({ error: "Failed to update policy" });
  }
});

// DELETE /admin/policies/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const policy = await prisma.policy.update({
      where: { id },
      data: { status: "archived" }
    });
    res.json(policy);
  } catch (error) {
    res.status(500).json({ error: "Failed to archive policy" });
  }
});

export default router;
