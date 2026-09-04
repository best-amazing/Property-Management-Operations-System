import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const teamService = {
  findAll: () => prisma.team.findMany({
    include: {
      lead: { select: { id: true, username: true, display_name: true } },
      members: { select: { id: true, username: true, display_name: true } },
    }
  }),
  findById: (id: string) => prisma.team.findUnique({
    where: { id },
    include: {
      lead: { select: { id: true, username: true, display_name: true } },
      members: { select: { id: true, username: true, display_name: true } },
    }
  }),
  create: (data: any) => prisma.team.create({ data }),
  update: (id: string, data: any) => prisma.team.update({ where: { id }, data }),
  delete: (id: string) => prisma.team.delete({ where: { id } }),
};
