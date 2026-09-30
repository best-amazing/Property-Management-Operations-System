import { Router } from "express";
import prisma from "../../utils/prisma";

const router = Router();

// GET /client/properties?mine=true
// Active properties; `mine=true` limits to properties assigned to the caller.
router.get("/", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const properties = await prisma.property.findMany({
      where: {
        status: "active",
        ...(req.query.mine === "true" ? { staff: { some: { user_id: userId } } } : {}),
      },
      include: { staff: { include: { user: { select: { id: true, display_name: true } } } } },
      orderBy: { name: "asc" },
    });
    res.json(properties);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

export default router;
