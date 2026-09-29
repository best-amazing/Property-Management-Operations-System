import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /client/announcements
// Fetch active announcements applicable to the logged-in user
router.get("/", async (req, res) => {
  try {
    const userId = (req as any).user?.id; // Assumes requireAuth sets req.user
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const receipts = await prisma.announcementReceipt.findMany({
      where: {
        user_id: userId,
        announcement: {
          publish_at: { lte: new Date() },
          OR: [
            { expires_at: null },
            { expires_at: { gt: new Date() } }
          ]
        }
      },
      include: { announcement: true },
      orderBy: { announcement: { created_at: "desc" } }
    });
    res.json(receipts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

// POST /client/announcements/:id/view
router.post("/:id/view", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    
    await prisma.announcementReceipt.update({
      where: { announcement_id_user_id: { announcement_id: id, user_id: userId } },
      data: { status: "viewed", viewed_at: new Date() }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark as viewed" });
  }
});

// POST /client/announcements/:id/acknowledge
router.post("/:id/acknowledge", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    
    await prisma.announcementReceipt.update({
      where: { announcement_id_user_id: { announcement_id: id, user_id: userId } },
      data: { status: "acknowledged", ack_at: new Date() }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to acknowledge announcement" });
  }
});

export default router;
