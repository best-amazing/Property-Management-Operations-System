import { Router } from "express";
import prisma from "../../utils/prisma";
import { describeAudience, resolveUserNames } from "../../services/announcement.service";

const router = Router();

// GET /client/announcements
// Active announcements delivered to the logged-in user. Fetching them marks
// any not-yet-delivered receipts as delivered.
router.get("/", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const now = new Date();

    const receipts = await prisma.announcementReceipt.findMany({
      where: {
        user_id: userId,
        announcement: {
          status: "sent",
          publish_at: { lte: now },
          OR: [{ expires_at: null }, { expires_at: { gt: now } }],
        },
      },
      include: { announcement: true },
      orderBy: { announcement: { publish_at: "desc" } },
    });

    const undelivered = receipts.filter(r => r.status === "sent").map(r => r.id);
    if (undelivered.length) {
      await prisma.announcementReceipt.updateMany({
        where: { id: { in: undelivered }, status: "sent" },
        data: { status: "delivered", delivered_at: now },
      });
    }

    const names = await resolveUserNames(receipts.map(r => r.announcement.created_by));
    const audiences = new Map<string, string>();
    for (const r of receipts) {
      if (!audiences.has(r.announcement.id)) audiences.set(r.announcement.id, await describeAudience(r.announcement));
    }

    res.json(receipts.map(r => ({
      ...r,
      status: r.status === "sent" ? "delivered" : r.status,
      delivered_at: r.delivered_at ?? (r.status === "sent" ? now : null),
      announcement: {
        ...r.announcement,
        created_by_name: names[r.announcement.created_by] || "Admin",
        audience: audiences.get(r.announcement.id),
      },
    })));
  } catch (error) {
    console.error("Failed to fetch announcements:", error);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

// POST /client/announcements/:id/view
router.post("/:id/view", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const now = new Date();
    // Never downgrade an acknowledged receipt back to "viewed".
    const result = await prisma.announcementReceipt.updateMany({
      where: { announcement_id: req.params.id, user_id: userId, status: { in: ["sent", "delivered"] } },
      data: { status: "viewed", viewed_at: now },
    });
    await prisma.announcementReceipt.updateMany({
      where: { announcement_id: req.params.id, user_id: userId, delivered_at: null },
      data: { delivered_at: now },
    });
    res.json({ success: true, updated: result.count });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark as viewed" });
  }
});

// POST /client/announcements/:id/acknowledge
router.post("/:id/acknowledge", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const receipt = await prisma.announcementReceipt.findUnique({
      where: { announcement_id_user_id: { announcement_id: req.params.id, user_id: userId } },
    });
    if (!receipt) return res.status(404).json({ error: "Announcement not found" });

    const now = new Date();
    await prisma.announcementReceipt.update({
      where: { id: receipt.id },
      data: {
        status: "acknowledged",
        ack_at: receipt.ack_at ?? now,
        viewed_at: receipt.viewed_at ?? now,
        delivered_at: receipt.delivered_at ?? now,
      },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to acknowledge announcement" });
  }
});

export default router;
