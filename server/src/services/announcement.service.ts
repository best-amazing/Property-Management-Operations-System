// services/announcement.service.ts
import { Announcement } from "@prisma/client";
import prisma from "../utils/prisma";
import { sendEmail } from "./mailer";

export const TARGET_TYPES = ["all", "user", "team", "staff_type"] as const;
export const PRIORITIES = ["normal", "important", "urgent"] as const;

// Everything a delivery channel needs to render a notification, so channels
// never have to query the database themselves.
export interface AnnouncementNotification {
  id: string;
  title: string;
  content: string;
  priority: string;
  require_ack: boolean;
  sender: string;
  audience: string;
  sent_at: Date;
}

export interface Recipient {
  id: string;
  username: string;
  display_name: string;
}

// A delivery channel. In-app delivery is always on; new channels (email, SMS,
// push, …) are added by implementing this interface and registering them in
// `channels` below — the announcement system itself does not change.
export interface AnnouncementChannel {
  name: string;
  enabled: () => boolean;
  deliver: (notification: AnnouncementNotification, recipients: Recipient[]) => Promise<void>;
}

const inAppChannel: AnnouncementChannel = {
  name: "in_app",
  enabled: () => true,
  deliver: async (notification, recipients) => {
    // Receipts are the in-app inbox; the socket event is a best-effort nudge
    // for clients that are connected right now.
    try {
      const { getIO } = require("../socket");
      const io = getIO();
      recipients.forEach(r => io.to(`user_${r.id}`).emit("new_announcement", notification));
    } catch {
      // Socket server not running (e.g. tests, scripts) — receipts still exist.
    }
  },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const emailChannel: AnnouncementChannel = {
  name: "email",
  enabled: () => process.env.ANNOUNCEMENT_EMAIL_ENABLED === "true",
  deliver: async (n, recipients) => {
    const subject = `[${n.priority.toUpperCase()}] ${n.title}`;
    const body = `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #333;">
        <h3>${escapeHtml(n.title)}</h3>
        <p style="white-space: pre-wrap;">${escapeHtml(n.content)}</p>
        <p style="color: #666; font-size: 13px;">
          From ${escapeHtml(n.sender)} · ${escapeHtml(n.audience)} · ${escapeHtml(n.sent_at.toLocaleString())}
          ${n.require_ack ? "<br/><strong>Please sign in to PMOS to acknowledge this announcement.</strong>" : ""}
        </p>
      </div>`;
    await Promise.all(
      recipients
        .filter(r => EMAIL_RE.test(r.username))
        .map(r => sendEmail(r.username, subject, body).catch(err =>
          console.error(`[announcement] email to ${r.username} failed:`, err)
        ))
    );
  },
};

const channels: AnnouncementChannel[] = [inAppChannel, emailChannel];

export function getTargetIds(a: Pick<Announcement, "target_ids" | "target_id">): string[] {
  if (Array.isArray(a.target_ids)) return a.target_ids.filter((x): x is string => typeof x === "string");
  return a.target_id ? [a.target_id] : [];
}

export async function resolveRecipients(a: Pick<Announcement, "target_type" | "target_ids" | "target_id">): Promise<Recipient[]> {
  const ids = getTargetIds(a);
  const select = { id: true, username: true, display_name: true };
  switch (a.target_type) {
    case "all":
      return prisma.user.findMany({ select });
    case "user":
      return ids.length ? prisma.user.findMany({ where: { id: { in: ids } }, select }) : [];
    case "team":
      return ids.length ? prisma.user.findMany({ where: { team_id: { in: ids } }, select }) : [];
    case "staff_type":
      return ids.length ? prisma.user.findMany({ where: { staff_type_id: { in: ids } }, select }) : [];
    default:
      return [];
  }
}

// Human-readable audience, e.g. "All Staff" or "Team: Property Management".
export async function describeAudience(a: Pick<Announcement, "target_type" | "target_ids" | "target_id">): Promise<string> {
  const ids = getTargetIds(a);
  if (a.target_type === "all") return "All Staff";
  let names: string[] = [];
  let label = "";
  if (a.target_type === "user") {
    label = "Staff";
    names = (await prisma.user.findMany({ where: { id: { in: ids } }, select: { display_name: true } })).map(u => u.display_name);
  } else if (a.target_type === "team") {
    label = "Team";
    names = (await prisma.team.findMany({ where: { id: { in: ids } }, select: { name: true } })).map(t => t.name);
  } else if (a.target_type === "staff_type") {
    label = "Staff Type";
    names = (await prisma.staffType.findMany({ where: { id: { in: ids } }, select: { name: true } })).map(s => s.name);
  }
  return names.length ? `${label}: ${names.join(", ")}` : label || a.target_type;
}

export async function resolveUserNames(ids: (string | null | undefined)[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x && x !== "system"))];
  if (!unique.length) return {};
  const users = await prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, display_name: true } });
  return Object.fromEntries(users.map(u => [u.id, u.display_name]));
}

// Publishes an announcement: creates a receipt per recipient and notifies them
// through every enabled channel. Safe to call repeatedly — only announcements
// that are scheduled and due are dispatched, and the status flip is atomic so
// concurrent calls (request + scheduler) never double-send.
export async function dispatchAnnouncement(id: string): Promise<boolean> {
  const now = new Date();
  const claimed = await prisma.announcement.updateMany({
    where: { id, status: "scheduled", publish_at: { lte: now } },
    data: { status: "sent", dispatched_at: now },
  });
  if (claimed.count === 0) return false;

  const announcement = await prisma.announcement.findUniqueOrThrow({ where: { id } });
  const recipients = await resolveRecipients(announcement);

  if (recipients.length) {
    await prisma.announcementReceipt.createMany({
      data: recipients.map(r => ({ announcement_id: id, user_id: r.id, status: "sent", sent_at: now })),
      skipDuplicates: true,
    });
  }

  const [names, audience] = await Promise.all([
    resolveUserNames([announcement.created_by]),
    describeAudience(announcement),
  ]);
  const notification: AnnouncementNotification = {
    id,
    title: announcement.title,
    content: announcement.content,
    priority: announcement.priority,
    require_ack: announcement.require_ack,
    sender: names[announcement.created_by] || "Admin",
    audience,
    sent_at: now,
  };

  for (const channel of channels) {
    if (!channel.enabled()) continue;
    try {
      await channel.deliver(notification, recipients);
    } catch (err) {
      console.error(`[announcement] channel ${channel.name} failed for ${id}:`, err);
    }
  }
  console.log(`[announcement] dispatched ${id} to ${recipients.length} recipient(s)`);
  return true;
}

export async function dispatchDueAnnouncements(): Promise<number> {
  const due = await prisma.announcement.findMany({
    where: { status: "scheduled", publish_at: { lte: new Date() } },
    select: { id: true },
  });
  let sent = 0;
  for (const { id } of due) {
    try {
      if (await dispatchAnnouncement(id)) sent++;
    } catch (err) {
      console.error(`[announcement] failed to dispatch ${id}:`, err);
    }
  }
  return sent;
}

let schedulerTimer: NodeJS.Timeout | null = null;

// Publishes scheduled announcements once their publish time arrives.
export function startAnnouncementScheduler(intervalMs = 60 * 1000): void {
  if (schedulerTimer) return;
  const tick = () => dispatchDueAnnouncements().catch(err => console.error("[announcement] scheduler error:", err));
  tick();
  schedulerTimer = setInterval(tick, intervalMs);
}
