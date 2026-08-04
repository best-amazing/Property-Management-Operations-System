import { PrismaClient } from "@prisma/client";
import { notifyNoteAdded } from "./notification.service";

const prisma = new PrismaClient();

export const noteService = {
  findAllByTicket: (ticketId: string) => prisma.note.findMany({ where: { ticket_id: ticketId } }),
  create: async (data: any) => {
    const ticket = await prisma.ticket.findUnique({
      where: { id: data.ticket_id },
      select: { assigned_to: true, title: true, property: true, unit: true },
    });

    const note = await prisma.note.create({ data });

    if (ticket?.assigned_to && ticket.assigned_to !== data.author) {
      notifyNoteAdded(ticket.assigned_to, ticket, data.text, data.author || "Unknown").catch((err) =>
        console.error(`[notification] FAILED note-added email: ${err.message}`)
      );
    }

    return note;
  },
  delete: (id: string) => prisma.note.delete({ where: { id } }),
};