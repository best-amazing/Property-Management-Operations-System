import { Router } from "express";
import prisma from "../../utils/prisma";
import {
  TARGET_TYPES, PRIORITIES, dispatchAnnouncement, describeAudience, resolveUserNames, getTargetIds,
} from "../../services/announcement.service";

const router = Router();

type Body = Record<string, any>;

// Validates and normalises announcement fields. `partial` allows omitted fields
// (for updates). Returns an error message or the Prisma data object.
function parseAnnouncement(body: Body, partial: boolean): { error: string } | { data: Body } {
  const data: Body = {};

  if (body.title !== undefined || !partial) {
    if (typeof body.title !== "string" || !body.title.trim()) return { error: "Title is required" };
    data.title = body.title.trim();
  }
  if (body.content !== undefined || !partial) {
    data.content = typeof body.content === "string" ? body.content : "";
  }
  if (body.priority !== undefined) {
    if (!PRIORITIES.includes(body.priority)) return { error: "Invalid priority" };
    data.priority = body.priority;
  }
  if (body.require_ack !== undefined) data.require_ack = !!body.require_ack;

  if (body.target_type !== undefined || !partial) {
    const targetType = body.target_type ?? "all";
    if (!TARGET_TYPES.includes(targetType)) return { error: "Invalid target type" };
    let ids: string[] = Array.isArray(body.target_ids)
      ? body.target_ids.filter((x: unknown) => typeof x === "string" && x)
      : body.target_id ? [body.target_id] : [];
    if (targetType === "all") ids = [];
    else if (!ids.length) return { error: "Select at least one recipient" };
    data.target_type = targetType;
    data.target_ids = targetType === "all" ? null : ids;
    data.target_id = ids[0] ?? null;
  }

  if (body.publish_at !== undefined) {
    const d = body.publish_at ? new Date(body.publish_at) : new Date();
    if (isNaN(d.getTime())) return { error: "Invalid publish date" };
    data.publish_at = d;
  }
  if (body.expires_at !== undefined) {
    const d = body.expires_at ? new Date(body.expires_at) : null;
    if (d && isNaN(d.getTime())) return { error: "Invalid expiration date" };
    data.expires_at = d;
  }
  const publishAt: Date = data.publish_at ?? new Date();
  if (data.expires_at && data.expires_at <= publishAt) return { error: "Expiration must be after the publish date" };

  return { data };
}

async function withDetails<T extends { id: string; created_by: string; updated_by?: string | null; target_type: string; target_ids: any; target_id: string | null }>(
  announcements: (T & { receipts?: { status: string }[] })[]
) {
  const names = await resolveUserNames(announcements.flatMap(a => [a.created_by, a.updated_by]));
  return Promise.all(announcements.map(async ({ receipts, ...a }) => {
    const stats = { total: 0, sent: 0, delivered: 0, viewed: 0, acknowledged: 0 };
    for (const r of receipts ?? []) {
      stats.total++;
      if (r.status in stats) (stats as any)[r.status]++;
    }
    return {
      ...a,
      target_ids: getTargetIds(a),
      created_by_name: names[a.created_by] || "Admin",
      updated_by_name: a.updated_by ? names[a.updated_by] : undefined,
      audience: await describeAudience(a),
      stats,
    };
  }));
}

// GET /admin/announcements
router.get("/", async (_req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { created_at: "desc" },
      include: { receipts: { select: { status: true } } },
    });
    res.json(await withDetails(announcements));
  } catch (error) {
    console.error("Failed to fetch announcements:", error);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

// GET /admin/announcements/:id/receipts
// Per-recipient delivery status: sent → delivered → viewed → acknowledged.
router.get("/:id/receipts", async (req, res) => {
  try {
    const receipts = await prisma.announcementReceipt.findMany({
      where: { announcement_id: req.params.id },
      include: { user: { select: { id: true, display_name: true, username: true } } },
      orderBy: { user: { display_name: "asc" } },
    });
    res.json(receipts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch receipts" });
  }
});

// POST /admin/announcements
router.post("/", async (req, res) => {
  try {
    const parsed = parseAnnouncement(req.body, false);
    if ("error" in parsed) return res.status(400).json({ error: parsed.error });
    const adminId = (req as any).user?.id || "system";

    const created = await prisma.announcement.create({
      data: { ...parsed.data, status: "scheduled", created_by: adminId } as any,
    });
    // Publishes immediately when publish_at is now/past; otherwise the
    // scheduler picks it up when it falls due.
    await dispatchAnnouncement(created.id);

    const announcement = await prisma.announcement.findUniqueOrThrow({
      where: { id: created.id },
      include: { receipts: { select: { status: true } } },
    });
    res.status(201).json((await withDetails([announcement]))[0]);
  } catch (error) {
    console.error("Failed to create announcement:", error);
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

// PUT /admin/announcements/:id
// Scheduled announcements can be fully edited. Once sent, the audience and
// publish date are fixed (receipts already exist) but the wording, priority
// and expiry can still be corrected.
router.put("/:id", async (req, res) => {
  try {
    const existing = await prisma.announcement.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Announcement not found" });
    if (existing.status === "cancelled") return res.status(400).json({ error: "Cancelled announcements cannot be edited" });

    const body = { ...req.body };
    if (existing.status === "sent") {
      delete body.target_type; delete body.target_ids; delete body.target_id;
      delete body.publish_at; delete body.require_ack;
    }
    const parsed = parseAnnouncement(body, true);
    if ("error" in parsed) return res.status(400).json({ error: parsed.error });
    const publishAt = parsed.data.publish_at ?? existing.publish_at;
    const expiresAt = parsed.data.expires_at !== undefined ? parsed.data.expires_at : existing.expires_at;
    if (expiresAt && expiresAt <= publishAt) return res.status(400).json({ error: "Expiration must be after the publish date" });

    await prisma.announcement.update({
      where: { id: existing.id },
      data: { ...parsed.data, updated_by: (req as any).user?.id || "system" },
    });
    if (existing.status === "scheduled") await dispatchAnnouncement(existing.id);

    const announcement = await prisma.announcement.findUniqueOrThrow({
      where: { id: existing.id },
      include: { receipts: { select: { status: true } } },
    });
    res.json((await withDetails([announcement]))[0]);
  } catch (error) {
    console.error("Failed to update announcement:", error);
    res.status(500).json({ error: "Failed to update announcement" });
  }
});

// POST /admin/announcements/:id/cancel
// Cancels a scheduled announcement, or withdraws a sent one from staff inboxes.
router.post("/:id/cancel", async (req, res) => {
  try {
    const existing = await prisma.announcement.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Announcement not found" });
    const announcement = await prisma.announcement.update({
      where: { id: existing.id },
      data: { status: "cancelled", updated_by: (req as any).user?.id || "system" },
    });
    res.json(announcement);
  } catch (error) {
    res.status(500).json({ error: "Failed to cancel announcement" });
  }
});

export default router;
