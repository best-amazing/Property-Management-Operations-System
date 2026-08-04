import { PrismaClient } from "@prisma/client";
import { notifyTicketAssigned, notifyTicketStatusUpdated, resolveAssigneeEmail } from "./notification.service";

const prisma = new PrismaClient();

export const ticketService = {
  findAllByPipeline: (pipelineId: string, assignedTo?: string) => {
    const where: any = { pipeline_id: pipelineId };
    if (assignedTo) {
      where.assigned_to = assignedTo;
    }
    return prisma.ticket.findMany({ where });
  },
  findById: (id: string) => prisma.ticket.findUnique({ where: { id } }),
  create: async (data: any) => {
    const pipeline = data.pipeline_id
      ? await prisma.pipeline.findUnique({ where: { id: data.pipeline_id }, select: { stages: true, default_checklist: true } })
      : null;
    const stages = pipeline?.stages as any[] | undefined;
    const stageIndex = data.stage_index ?? 0;
    data.stage_index = stageIndex;
    data.stage_entered_at = data.stage_entered_at || new Date();
    if (!data.checklist) {
      const defaultChecklist = pipeline?.default_checklist as any[] | undefined;
      data.checklist = defaultChecklist ? defaultChecklist.map((label: any) => ({ label, done: false })) : [];
    }
    if (!data.history) {
      data.history = [{
        stage_index: stageIndex,
        stage_name: stages?.[stageIndex] ?? String(stageIndex),
        entered_at: new Date().toISOString(),
        user: data.created_by || "system",
      }];
    }
    if (stages && stageIndex === stages.length - 1) {
      data.completed_at = data.completed_at || new Date();
    }
    const ticket = await prisma.ticket.create({ data });
    if (ticket.assigned_to) {
      console.log(`[notification] ticket created id=${ticket.id} assigned_to=${ticket.assigned_to}`);
      const email = await resolveAssigneeEmail(ticket.assigned_to);
      if (email) {
        notifyTicketAssigned(email, ticket, data.created_by || "system").catch((err) =>
          console.error(`[notification] FAILED ticket-assigned email: ${err.message}`)
        );
      } else {
        console.log(`[notification] skip ticket-assigned email for ${ticket.assigned_to}`);
      }
    } else {
      console.log(`[notification] ticket created id=${ticket.id} with NO assignee, skipping email`);
    }
    return ticket;
  },
  update: async (id: string, data: any, user?: { display_name: string }) => {
    const existing = await prisma.ticket.findUnique({
      where: { id },
      select: {
        pipeline_id: true,
        stage_index: true,
        history: true,
        assigned_to: true,
        title: true,
        property: true,
        unit: true,
        due_date: true,
      },
    });
    if (!existing) {
      throw new Error("Ticket not found");
    }

    if (data.stage_index !== undefined) {
      const pipeline = await prisma.pipeline.findUnique({
        where: { id: existing.pipeline_id },
        select: { stages: true },
      });
      const stages = pipeline?.stages as any[] | undefined;
      const lastIndex = stages ? stages.length - 1 : 0;
      const history = (existing.history as any[]) || [];
      history.push({
        stage_index: data.stage_index,
        stage_name: stages?.[data.stage_index] ?? String(data.stage_index),
        entered_at: new Date().toISOString(),
        user: user?.display_name || "system",
      });
      data.history = history;
      if (data.stage_index === lastIndex) {
        data.completed_at = new Date();
      } else if (existing.stage_index === lastIndex) {
        data.completed_at = null;
      }
    }

    const updated = await prisma.ticket.update({ where: { id }, data });
    const actor = user?.display_name || "system";

    if (data.assigned_to && data.assigned_to !== existing.assigned_to) {
      console.log(`[notification] assignment changed ticket=${id} ${existing.assigned_to} -> ${data.assigned_to}`);
      const email = await resolveAssigneeEmail(data.assigned_to);
      if (email) {
        notifyTicketAssigned(email, { ...existing, ...updated, assigned_to: data.assigned_to }, actor).catch((err) =>
          console.error(`[notification] FAILED ticket-assigned email: ${err.message}`)
        );
      } else {
        console.log(`[notification] skip assignment email for ${data.assigned_to}`);
      }
    }

    if (data.stage_index !== undefined && data.stage_index !== existing.stage_index) {
      const stages = (await prisma.pipeline.findUnique({
        where: { id: existing.pipeline_id },
        select: { stages: true },
      }))?.stages as any[] | undefined;
      const addressee = data.assigned_to ?? existing.assigned_to;
      const email = await resolveAssigneeEmail(addressee);
      if (email) {
        const prevStage = stages?.[existing.stage_index] ?? String(existing.stage_index);
        const newStage = stages?.[data.stage_index] ?? String(data.stage_index);
        console.log(`[notification] status changed ticket=${id} ${prevStage} -> ${newStage} notify=${email}`);
        notifyTicketStatusUpdated(email, { ...existing, ...updated }, newStage, prevStage, actor).catch((err) =>
          console.error(`[notification] FAILED status-update email: ${err.message}`)
        );
      } else {
        console.log(`[notification] status changed ticket=${id} but no resolvable assignee, skipping email`);
      }
    }

    return updated;
  },
  updateChecklist: (id: string, checklist: any) =>
    prisma.ticket.update({ where: { id }, data: { checklist } }),
  delete: async (id: string) => {
    await prisma.note.deleteMany({ where: { ticket_id: id } });
    return prisma.ticket.delete({ where: { id } });
  },
};
