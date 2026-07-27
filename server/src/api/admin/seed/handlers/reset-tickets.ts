import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DAY = 86400000;

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY);
}

function mkTicket(pipelineId: string, stageIndex: number, stages: string[], checklist: any[], overrides: any) {
  const enteredAt = daysAgo(overrides.stageAgo);
  const isTerminal = stageIndex === stages.length - 1;
  return {
    pipeline_id: pipelineId,
    stage_index: stageIndex,
    stage_entered_at: enteredAt,
    title: overrides.title,
    property: overrides.property || null,
    unit: overrides.unit || null,
    tag: overrides.tag || null,
    category: overrides.category || null,
    assigned_to: overrides.assignedTo || null,
    created_at: daysAgo(overrides.createdAgo),
    completed_at: isTerminal ? enteredAt : null,
    checklist: checklist.map((label: string) => ({ label, done: false })),
    history: [{
      stage_index: stageIndex,
      stage_name: stages[stageIndex],
      entered_at: enteredAt.toISOString(),
      user: overrides.assignedTo || "system",
    }],
  };
}

export const resetTicketsHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const pipelines = await prisma.pipeline.findMany({ select: { id: true, code: true, stages: true, default_checklist: true } });

    const demo = [
      // ── Leasing (code: L) ──
      { code: "L", stageIdx: 2, title: "Maplewood #4B — Sarah Chen", property: "Maplewood Apartments", unit: "4B", tag: "Hot", category: "Zillow", assignedTo: "Priya Shah", createdAgo: 2, stageAgo: 1 },
      { code: "L", stageIdx: 0, title: "Oak St #1 — Marcus Webb", property: "Oak Street Duplex", unit: "1", tag: "Warm", category: "Referral", assignedTo: "Jordan Lee", createdAgo: 1, stageAgo: 1 },
      { code: "L", stageIdx: 6, title: "Birchwood #12 — Dana Ruiz", property: "Birchwood Court", unit: "12", tag: "Hot", category: "Apartments.com", assignedTo: "Priya Shah", createdAgo: 6, stageAgo: 1 },
      { code: "L", stageIdx: 8, title: "Maplewood #2A — Completed move-in", property: "Maplewood Apartments", unit: "2A", tag: "Warm", category: "MLS", assignedTo: "Priya Shah", createdAgo: 14, stageAgo: 9 },

      // ── Maintenance (code: M) ──
      { code: "M", stageIdx: 2, title: "Maplewood #4B — No heat", property: "Maplewood Apartments", unit: "4B", tag: "Emergency", category: "HVAC", assignedTo: "Vendor: ColdStar HVAC", createdAgo: 2, stageAgo: 2 },
      { code: "M", stageIdx: 5, title: "Oak St #2 — Leaky faucet", property: "Oak Street Duplex", unit: "2", tag: "Routine", category: "Plumbing", assignedTo: "In-house handyman", createdAgo: 3, stageAgo: 1 },
      { code: "M", stageIdx: 1, title: "Birchwood #7 — Outlet not working", property: "Birchwood Court", unit: "7", tag: "Urgent", category: "Electrical", assignedTo: "Vendor: Volt Right Electric", createdAgo: 1, stageAgo: 1 },
      { code: "M", stageIdx: 7, title: "Oak St #4 — Garbage disposal replaced", property: "Oak Street Duplex", unit: "4", tag: "Routine", category: "Appliance", assignedTo: "In-house handyman", createdAgo: 10, stageAgo: 6 },

      // ── Turns (code: T) ──
      { code: "T", stageIdx: 3, title: "Maplewood #9C — Move-out turn", property: "Maplewood Apartments", unit: "9C", tag: "Standard", category: "Standard Turn", assignedTo: "Jordan Lee", createdAgo: 5, stageAgo: 2 },
      { code: "T", stageIdx: 0, title: "Oak St #1 — Heavy turn", property: "Oak Street Duplex", unit: "1", tag: "Rush", category: "Heavy Turn", assignedTo: "Jordan Lee", createdAgo: 1, stageAgo: 1 },
      { code: "T", stageIdx: 6, title: "Birchwood #3 — Re-leased", property: "Birchwood Court", unit: "3", tag: "Standard", category: "Light Turn", assignedTo: "Priya Shah", createdAgo: 10, stageAgo: 4 },

      // ── Escalation (code: E) ──
      { code: "E", stageIdx: 3, title: "Oak St #2 — Late rent, 2nd month", property: "Oak Street Duplex", unit: "2", tag: "Moderate", category: "Non-payment", assignedTo: "Priya Shah", createdAgo: 20, stageAgo: 3 },
      { code: "E", stageIdx: 1, title: "Maplewood #6 — Noise complaints", property: "Maplewood Apartments", unit: "6", tag: "Minor", category: "Noise", assignedTo: "Priya Shah", createdAgo: 4, stageAgo: 2 },
      { code: "E", stageIdx: 4, title: "Birchwood #12 — Unauthorized occupant", property: "Birchwood Court", unit: "12", tag: "Severe", category: "Unauthorized Occupant", assignedTo: "Alex Rivera", createdAgo: 15, stageAgo: 5 },
      { code: "E", stageIdx: 6, title: "Maplewood #1 — Resolved noise complaint", property: "Maplewood Apartments", unit: "1", tag: "Minor", category: "Noise", assignedTo: "Priya Shah", createdAgo: 12, stageAgo: 8 },
    ];

    // Delete all existing notes and tickets
    await prisma.note.deleteMany();
    await prisma.ticket.deleteMany();

    // Build and insert seed tickets
    const seedData: any[] = [];
    const seedNotes: { ticketIndex: number; author: string; text: string; ts: Date }[] = [];

    for (const d of demo) {
      const pipeline = pipelines.find(p => p.code === d.code);
      if (!pipeline) continue;
      const stages = pipeline.stages as string[];
      const cl = pipeline.default_checklist as any[];
      const idx = seedData.length;
      seedData.push(mkTicket(pipeline.id, d.stageIdx, stages, cl, d));

      // Add a note for the first Leasing and first Maintenance ticket
      if (idx === 0) {
        seedNotes.push({ ticketIndex: idx, author: "Priya Shah", text: "Showed the unit, she loved it — sending the application link today.", ts: daysAgo(1) });
      }
      if (idx === 4) {
        seedNotes.push({ ticketIndex: idx, author: "Jordan Lee", text: "Tenant reports no heat overnight. Dispatched ColdStar, waiting on confirmation call.", ts: daysAgo(2) });
      }
    }

    await prisma.ticket.createMany({ data: seedData });

    // Create notes for the seeded tickets that have them
    for (const n of seedNotes) {
      const ticket = seedData[n.ticketIndex];
      if (ticket) {
        const dbTicket = await prisma.ticket.findFirst({ where: { title: ticket.title, pipeline_id: ticket.pipeline_id }, select: { id: true } });
        if (dbTicket) {
          await prisma.note.create({
            data: { text: n.text, author: n.author, ticket_id: dbTicket.id, created_at: n.ts },
          });
        }
      }
    }

    res.json({ message: "Tickets reset to demo set" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
