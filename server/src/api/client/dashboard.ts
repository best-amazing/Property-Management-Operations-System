import { Router } from "express";
import prisma from "../../utils/prisma";

const router = Router();

// A category with no audience is visible to everyone; otherwise only admins
// and the listed staff types see it.
function canSee(category: { audience_staff_types: unknown }, user: any): boolean {
  const audience = Array.isArray(category.audience_staff_types) ? category.audience_staff_types : [];
  if (!audience.length || user?.role === "admin") return true;
  return !!user?.staff_type_id && audience.includes(user.staff_type_id);
}

// GET /client/dashboard/policies
// Published policies and documentation, grouped by the admin-configured
// categories (dashboard sections) the caller is allowed to see.
router.get("/policies", async (req, res) => {
  try {
    const user = (req as any).user;
    const categories = await prisma.policyCategory.findMany({
      include: {
        policies: {
          where: { status: "published" },
          orderBy: [{ order: "asc" }, { created_at: "asc" }],
        },
      },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });
    const visible = categories
      .filter(cat => cat.policies.length > 0 && canSee(cat, user))
      .map(({ audience_staff_types, ...cat }) => cat);
    res.json(visible);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dashboard policies" });
  }
});

// GET /client/dashboard/policies/:id
router.get("/policies/:id", async (req, res) => {
  try {
    const policy = await prisma.policy.findFirst({
      where: { id: req.params.id, status: "published" },
      include: { category: true },
    });
    if (!policy || !canSee(policy.category, (req as any).user)) {
      return res.status(404).json({ error: "Policy not found or unpublished" });
    }
    res.json(policy);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch policy" });
  }
});

export default router;
