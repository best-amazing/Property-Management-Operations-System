import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /admin/announcements
router.get("/", async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { created_at: "desc" }
    });
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

// POST /admin/announcements
router.post("/", async (req, res) => {
  try {
    const { title, content, priority, target_type, target_id, require_ack, publish_at, expires_at } = req.body;
    const adminId = (req as any).user?.id || "system";

    const announcement = await prisma.announcement.create({ 
      data: {
        title, content, priority, target_type, target_id, require_ack,
        publish_at: publish_at ? new Date(publish_at) : undefined,
        expires_at: expires_at ? new Date(expires_at) : undefined,
        created_by: adminId
      }
    });

    // Determine target users based on target_type
    let targetUsers: { id: string }[] = [];
    if (target_type === "all") {
      targetUsers = await prisma.user.findMany({ select: { id: true } });
    } else if (target_type === "team" && target_id) {
      targetUsers = await prisma.user.findMany({ where: { team_id: target_id }, select: { id: true } });
    } else if (target_type === "staff_type" && target_id) {
      targetUsers = await prisma.user.findMany({ where: { staff_type_id: target_id }, select: { id: true } });
    } else if (target_type === "user" && target_id) {
      targetUsers = [{ id: target_id }];
    }

    // Create receipts for targeted users
    if (targetUsers.length > 0) {
      const receiptData = targetUsers.map(u => ({
        announcement_id: announcement.id,
        user_id: u.id,
        status: "delivered"
      }));
      await prisma.announcementReceipt.createMany({ data: receiptData });

      // Emit WebSocket event to targeted users
      try {
        const { getIO } = require("../../../socket");
        const io = getIO();
        targetUsers.forEach(u => {
          io.to(`user_${u.id}`).emit("new_announcement", announcement);
        });
      } catch (wsError) {
        console.error("WebSocket emission failed:", wsError);
      }
    }

    res.status(201).json(announcement);
  } catch (error) {
    console.error("Failed to create announcement:", error);
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

export default router;
