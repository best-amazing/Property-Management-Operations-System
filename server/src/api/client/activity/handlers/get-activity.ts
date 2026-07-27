import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getActivityHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const notes = await prisma.note.findMany({
      orderBy: { created_at: "desc" },
      take: 50,
      include: {
        ticket: {
          select: { id: true, title: true, pipeline_id: true },
        },
      },
    });

    const pipelineIds = new Set<string>();
    for (const note of notes) {
      if (note.ticket?.pipeline_id) pipelineIds.add(note.ticket.pipeline_id);
    }

    const ticketsWithHistory = await prisma.ticket.findMany({
      where: { history: { not: "[]" } },
      select: { id: true, title: true, pipeline_id: true, history: true },
    });
    for (const t of ticketsWithHistory) {
      pipelineIds.add(t.pipeline_id);
    }

    const pipelines = await prisma.pipeline.findMany({
      where: { id: { in: Array.from(pipelineIds) } },
      select: { id: true, code: true, label: true },
    });
    const pipelineMap = new Map(pipelines.map(p => [p.id, p]));

    const items: any[] = [];

    for (const note of notes) {
      const pl = note.ticket ? pipelineMap.get(note.ticket.pipeline_id) : null;
      items.push({
        type: "note",
        id: note.id,
        text: note.text,
        author: note.author,
        ticket_id: note.ticket_id,
        ticket_title: note.ticket?.title || "Unknown",
        pipeline_label: pl ? `${pl.code} · ${pl.label}` : "",
        created_at: note.created_at,
      });
    }

    for (const ticket of ticketsWithHistory) {
      const pl = pipelineMap.get(ticket.pipeline_id);
      const history = ticket.history as any[] | null;
      if (history) {
        for (const entry of history) {
          items.push({
            type: "stage_transition",
            ticket_id: ticket.id,
            ticket_title: ticket.title,
            author: entry.user || "system",
            text: `moved to "${entry.stage_name}"`,
            pipeline_label: pl ? `${pl.code} · ${pl.label}` : "",
            created_at: entry.entered_at,
          });
        }
      }
    }

    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(items.slice(0, 50));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
