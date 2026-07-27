import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const noteService = {
  findAllByTicket: (ticketId: string) => prisma.note.findMany({ where: { ticket_id: ticketId } }),
  create: (data: any) => prisma.note.create({ data }),
  delete: (id: string) => prisma.note.delete({ where: { id } }),
};
