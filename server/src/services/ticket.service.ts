import { PrismaClient } from "@prisma/client";

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
    return prisma.ticket.create({ data });
  },
  update: async (id: string, data: any, user?: { display_name: string }) => {
    if (data.stage_index !== undefined) {
      const existing = await prisma.ticket.findUnique({
        where: { id },
        select: { pipeline_id: true, stage_index: true, history: true },
      });
      if (existing) {
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
    }
    return prisma.ticket.update({ where: { id }, data });
  },
  updateChecklist: (id: string, checklist: any) =>
    prisma.ticket.update({ where: { id }, data: { checklist } }),
  delete: async (id: string) => {
    await prisma.note.deleteMany({ where: { ticket_id: id } });
    return prisma.ticket.delete({ where: { id } });
  },
};
