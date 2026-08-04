// services/notification.service.ts
import { PrismaClient } from "@prisma/client";
import { sendEmail } from "./mailer";

const prisma = new PrismaClient();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// assigned_to on a ticket holds a display name (e.g. "Priya Shah") or free text
// (e.g. "Vendor: ColdStar HVAC"), not necessarily an email. The user's email is
// their username, so we resolve the assignee to the matching User's email.
export async function resolveAssigneeEmail(assignee: string | null | undefined): Promise<string | null> {
  if (!assignee) return null;
  const trimmed = assignee.trim();
  if (!trimmed) return null;
  if (EMAIL_RE.test(trimmed)) {
    console.log(`[notification] resolveAssigneeEmail(${trimmed}) -> raw email`);
    return trimmed;
  }
  const user = await prisma.user.findFirst({
    where: { display_name: trimmed },
    select: { username: true },
  });
  if (!user) {
    console.log(`[notification] resolveAssigneeEmail(${trimmed}) -> NO matching user, cannot email`);
    return null;
  }
  console.log(`[notification] resolveAssigneeEmail(${trimmed}) -> ${user.username}`);
  return user.username;
}

function escapeHtml(value: unknown): string {
  const text = String(value ?? "");
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ticketRef(ticket: any): string {
  const property = ticket.property ? escapeHtml(ticket.property) : "";
  const unit = ticket.unit ? ` Unit ${escapeHtml(ticket.unit)}` : "";
  return `${property}${unit}`.trim() || "Unknown location";
}

function wrap(toEmail: string, subject: string, bodyHtml: string): Promise<void> {
  const full = `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #333;">
      ${bodyHtml}
      <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
      <p style="color: #888; font-size: 12px;">Sent by PMOS (Property Management Operating System).</p>
    </div>
  `;
  return sendEmail(toEmail, subject, full);
}

function html(toEmail: string, subject: string, body: string): Promise<void> {
  return wrap(toEmail, subject, body);
}

// Each helper is safe to call even when the assignee can't be resolved;
// the caller is responsible for catching/logging errors so notifications
// never break the underlying request.

export async function notifyTicketAssigned(assigneeUsername: string, ticket: any, byName: string): Promise<void> {
  const subject = `You've been assigned: ${escapeHtml(ticket.title)}`;
  console.log(`[notification] notifyTicketAssigned to=${assigneeUsername} ticket=${ticket.id} title="${ticket.title}"`);
  const body = `
    <h3>Ticket assigned to you</h3>
    <p>You have been assigned a ticket by <strong>${escapeHtml(byName)}</strong> at ${escapeHtml(ticketRef(ticket))}.</p>
    <p><strong>Title:</strong> ${escapeHtml(ticket.title)}</p>
    <p><strong>Due date:</strong> ${ticket.due_date ? escapeHtml(new Date(ticket.due_date).toLocaleString()) : "Not set"}</p>
  `;
  await html(assigneeUsername, subject, body);
}

export async function notifyNoteAdded(assigneeUsername: string, ticket: any, noteText: string, authorName: string): Promise<void> {
  const subject = `New note on: ${escapeHtml(ticket.title)}`;
  console.log(`[notification] notifyNoteAdded to=${assigneeUsername} ticket=${ticket.id} by=${authorName}`);
  const body = `
    <h3>New note on assigned ticket</h3>
    <p><strong>${escapeHtml(authorName)}</strong> added a note to <strong>${escapeHtml(ticket.title)}</strong> at ${escapeHtml(ticketRef(ticket))}.</p>
    <blockquote style="border-left: 3px solid #ccc; margin: 8px 0; padding-left: 12px; color: #555;">${escapeHtml(noteText)}</blockquote>
  `;
  await html(assigneeUsername, subject, body);
}

export async function notifyTicketStatusUpdated(assigneeUsername: string, ticket: any, newStage: string, prevStage: string, byName: string): Promise<void> {
  const subject = `Status updated: ${escapeHtml(ticket.title)}`;
  console.log(`[notification] notifyTicketStatusUpdated to=${assigneeUsername} ticket=${ticket.id} ${prevStage} -> ${newStage} by=${byName}`);
  const body = `
    <h3>Assigned ticket status updated</h3>
    <p><strong>${escapeHtml(byName)}</strong> moved <strong>${escapeHtml(ticket.title)}</strong> at ${escapeHtml(ticketRef(ticket))}.</p>
    <p>Status: <strong>${escapeHtml(prevStage)}</strong> → <strong>${escapeHtml(newStage)}</strong></p>
  `;
  await html(assigneeUsername, subject, body);
}